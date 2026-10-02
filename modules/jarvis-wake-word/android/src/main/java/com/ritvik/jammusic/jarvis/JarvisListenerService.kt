package com.ritvik.jammusic.jarvis

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.AudioRecordingConfiguration
import android.media.MediaRecorder
import android.media.ToneGenerator
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.speech.RecognitionListener
import android.speech.RecognitionService
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collectLatest
import xyz.rementia.openwakeword.DetectionMode
import xyz.rementia.openwakeword.WakeWordEngine
import xyz.rementia.openwakeword.WakeWordModel
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference

/**
 * Jarvis State Machine:
 * IDLE_LISTENING -> WAKE_DETECTED -> CAPTURING -> TRANSCRIBING -> COOLDOWN -> IDLE_LISTENING
 * Auxiliary states: PAUSED_MIC_IN_USE, PAUSED_CHARGING_ONLY
 *
 * Resilience Features:
 * - START_STICKY with onTaskRemoved watchdog (re-acquired if app is swiped from recents)
 * - Automatic pause during incoming/outgoing phone calls with backoff auto-resume
 * - Automatic pause when another app captures the microphone (AudioRecordingCallback)
 * - "Only listen while charging" battery saver mode
 * - SharedPreferences persistence for device boot restoration
 * - Audio focus ducking and earcon feedback
 */
enum class JarvisState {
    IDLE_LISTENING,
    WAKE_DETECTED,
    CAPTURING,
    TRANSCRIBING,
    COOLDOWN,
    PAUSED_MIC_IN_USE,
    PAUSED_CHARGING_ONLY
}

class JarvisListenerService : Service() {

    companion object {
        private const val TAG = "JarvisListener"
        const val CHANNEL_ID = "jarvis_listener_channel"
        const val NOTIFICATION_ID = 9001
        const val ACTION_STOP = "com.ritvik.jammusic.jarvis.STOP"
        private const val PREFS_NAME = "JarvisPrefs"
        private const val KEY_JARVIS_ENABLED = "jarvis_enabled"

        /** Dynamic threshold for wake word detection (tunable from JS, default 0.5) */
        @Volatile
        var wakeWordThreshold: Float = 0.5f

        /** Active service instance reference */
        var instance: JarvisListenerService? = null

        /** Allow barge-in during TTS (enabled by default so user can interrupt at any time) */
        @Volatile
        var allowBargeIn: Boolean = true

        /** Settings: Only listen when phone is connected to charger */
        @Volatile
        var onlyListenWhileCharging: Boolean = false

        /** Settings: Preferred STT recognition language (en-IN, hi-IN, auto) */
        @Volatile
        var preferredLanguage: String = "en-IN"

        /** Settings: Active wake word model ("hey_jarvis" or "hello_jarvis") */
        @Volatile
        var selectedWakeModel: String = "hey_jarvis"

        /** Settings: Active voice persona (stark_uk, friday, india, us) */
        @Volatile
        var selectedVoicePersona: String = JarvisTtsHelper.PERSONA_STARK

        /** Last reason why Jarvis listening was paused */
        @Volatile
        var lastPausedReason: String = ""

        /** Timestamp when service transitioned to PAUSED_MIC_IN_USE */
        @Volatile
        var pausedTimestamp: Long = 0L

        /** Timestamp when command capture started */
        @Volatile
        var lastCaptureStartTs: Long = 0L

        /** Callbacks set by the Expo Module bridge */
        var onWakeWordDetected: ((modelName: String, score: Float) -> Unit)? = null
        var onJarvisStateChanged: ((state: JarvisState) -> Unit)? = null
        var onCommandTranscript: ((text: String, isFinal: Boolean, confidence: Float?, nativeHandled: Boolean) -> Unit)? = null
        var onCommandError: ((reason: String) -> Unit)? = null
        var onNativeCommandExecuted: ((actionId: String, spokenReply: String, success: Boolean) -> Unit)? = null
        var onSpeechDone: ((utteranceId: String) -> Unit)? = null
        var onTimelineEvent: ((event: String, elapsedMs: Long, details: Map<String, Any>) -> Unit)? = null
    }

    private var wakeWordEngine: WakeWordEngine? = null
    private var speechRecognizer: SpeechRecognizer? = null
    private var ttsHelper: JarvisTtsHelper? = null
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val mainHandler = Handler(Looper.getMainLooper())

    private val currentState = AtomicReference(JarvisState.IDLE_LISTENING)
    private val isCapturingCommand = AtomicBoolean(false)
    private val captureSessionId = AtomicInteger(0)
    private val hasStartedSpeaking = AtomicBoolean(false)
    private var latestTranscript: String = ""
    private var wakeDetectedTs: Long = 0L
    private var lastWakeModelName: String = ""
    private var hasRetriedCapture = false

    private var noSpeechJob: Job? = null
    private var hardCapJob: Job? = null
    private var captureSafetyWatchdogJob: Job? = null
    private var watchdogJob: Job? = null
    private var micPauseDebounceJob: Job? = null
    private var micResumeDebounceJob: Job? = null

    private var focusRequest: AudioFocusRequest? = null
    private var notificationManager: NotificationManager? = null

    // Phone call monitoring
    private var telephonyManager: TelephonyManager? = null
    private var isCallActive = false
    private var phoneStateListener: Any? = null // Holds PhoneStateListener or TelephonyCallback

    // Mic recording conflict listener
    private var audioRecordingCallback: Any? = null

    // Power / charging monitoring
    private var powerReceiver: BroadcastReceiver? = null

    // Ambient real-world transitions monitoring
    private var ambientReceiver: BroadcastReceiver? = null
    private var lastAudioLinkAlertTs: Long = 0L
    private var lastPowerAlertTs: Long = 0L
    private var lastBatteryCriticalAlertTs: Long = 0L

    override fun onCreate() {

        super.onCreate()
        Log.i(TAG, "Service onCreate — initializing wake-word engine and resilience observers")
        instance = this
        notificationManager = getSystemService(NotificationManager::class.java)
        createNotificationChannel()

        // Initialize TextToSpeech engine
        ttsHelper = JarvisTtsHelper(this).apply {
            onSpeechDoneCallback = { utteranceId ->
                onSpeechDone?.invoke(utteranceId)
            }
        }

        // Persist enabled status in SharedPreferences for BootReceiver
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_JARVIS_ENABLED, true).apply()
        onlyListenWhileCharging = prefs.getBoolean("only_listen_while_charging", onlyListenWhileCharging)
        preferredLanguage = prefs.getString("preferred_language", preferredLanguage) ?: "en-IN"
        selectedWakeModel = prefs.getString("selected_wake_model", selectedWakeModel) ?: "hey_jarvis"
        selectedVoicePersona = prefs.getString("voice_persona", selectedVoicePersona) ?: JarvisTtsHelper.PERSONA_STARK
        ttsHelper?.setVoicePersona(selectedVoicePersona)

        // Register telephony and audio listeners for mic conflicts
        registerTelephonyObserver()
        registerAudioRecordingObserver()
        registerPowerObserver()
        registerAmbientObservers()

        // Start background resilience watchdog (auto-recovers if stuck in PAUSED_MIC_IN_USE)
        startWatchdog()
    }


    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            Log.i(TAG, "Stop action received — shutting down service")
            stopSelf()
            return START_NOT_STICKY
        }

        startForeground(NOTIFICATION_ID, buildNotification("Jarvis is listening", "Waiting for \"Hey Jarvis\"…"))

        // Check if onlyListenWhileCharging is active and currently on battery
        if (onlyListenWhileCharging && !isDeviceCharging()) {
            Log.i(TAG, "Starting paused: 'onlyListenWhileCharging' is active and device is on battery")
            setState(JarvisState.PAUSED_CHARGING_ONLY)
            updateNotification("Jarvis: Paused (Battery Power)", "Connect charger to resume listening")
        } else {
            startWakeWordEngine()
        }

        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onTaskRemoved(rootIntent: Intent?) {
        Log.i(TAG, "onTaskRemoved: Jam app swiped from recents — foreground service continues listening")
        // Schedule restart alarm watchdog in case an aggressive OEM kills the process
        try {
            val restartIntent = Intent(applicationContext, JarvisListenerService::class.java).apply {
                setPackage(packageName)
            }
            val pendingIntent = PendingIntent.getService(
                this, 101, restartIntent,
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
            )
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            alarmManager?.set(
                AlarmManager.ELAPSED_REALTIME,
                SystemClock.elapsedRealtime() + 1500,
                pendingIntent
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to schedule restart alarm onTaskRemoved", e)
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        Log.i(TAG, "Service onDestroy — releasing all resources")
        micPauseDebounceJob?.cancel()
        micResumeDebounceJob?.cancel()
        watchdogJob?.cancel()
        captureSafetyWatchdogJob?.cancel()
        serviceScope.cancel()
        noSpeechJob?.cancel()
        hardCapJob?.cancel()

        mainHandler.post {
            try {
                speechRecognizer?.destroy()
            } catch (e: Exception) {
                Log.w(TAG, "Error destroying speech recognizer on destroy", e)
            }
            speechRecognizer = null
        }

        unregisterTelephonyObserver()
        unregisterAudioRecordingObserver()
        unregisterPowerObserver()
        unregisterAmbientObservers()


        stopWakeWordEngine()
        abandonTransientAudioFocus()
        ttsHelper?.destroy()
        ttsHelper = null
        instance = null

        // Persist disabled state
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_JARVIS_ENABLED, false).apply()

        setState(JarvisState.IDLE_LISTENING)
        super.onDestroy()
    }

    // ==========================================
    // State Machine & Notification Management
    // ==========================================

    private fun logTimeline(event: String, details: Map<String, Any> = emptyMap()) {
        val now = System.currentTimeMillis()
        val elapsedMs = if (wakeDetectedTs > 0) now - wakeDetectedTs else 0L
        Log.i(TAG, "[TIMELINE +${elapsedMs}ms] $event ${if (details.isNotEmpty()) details else ""}")
        try {
            onTimelineEvent?.invoke(event, elapsedMs, details)
        } catch (e: Exception) {
            Log.w(TAG, "Error emitting onTimelineEvent", e)
        }
    }

    private fun setState(newState: JarvisState) {
        if (isCapturingCommand.get()) {
            // Guard: while command capture is actively running, refuse external pauses
            if (newState == JarvisState.PAUSED_MIC_IN_USE || newState == JarvisState.PAUSED_CHARGING_ONLY) {
                Log.w(TAG, "Blocked setState to $newState: command capture is currently active")
                return
            }
        }

        val oldState = currentState.getAndSet(newState)
        if (oldState != newState) {
            Log.i(TAG, "Jarvis state transition: $oldState -> $newState")
            logTimeline("STATE_TRANSITION", mapOf("from" to oldState.name, "to" to newState.name))
            onJarvisStateChanged?.invoke(newState)
        }
    }

    fun getCurrentStateName(): String = currentState.get().name

    private fun updateNotification(title: String, text: String) {
        try {
            val notification = buildNotification(title, text)
            notificationManager?.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to update notification", e)
        }
    }

    // ==========================================
    // Mic Conflicts & Telephony Handling
    // ==========================================

    private fun registerTelephonyObserver() {
        try {
            telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val callback = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                    override fun onCallStateChanged(state: Int) {
                        handlePhoneCallState(state)
                    }
                }
                phoneStateListener = callback
                telephonyManager?.registerTelephonyCallback(mainHandler::post, callback)
            } else {
                @Suppress("DEPRECATION")
                val listener = object : PhoneStateListener() {
                    @Deprecated("Deprecated in Java")
                    override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                        handlePhoneCallState(state)
                    }
                }
                phoneStateListener = listener
                @Suppress("DEPRECATION")
                telephonyManager?.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not register telephony listener", e)
        }
    }

    private fun unregisterTelephonyObserver() {
        try {
            val tm = telephonyManager ?: return
            val listener = phoneStateListener ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && listener is TelephonyCallback) {
                tm.unregisterTelephonyCallback(listener)
            } else if (listener is PhoneStateListener) {
                @Suppress("DEPRECATION")
                tm.listen(listener, PhoneStateListener.LISTEN_NONE)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error unregistering telephony listener", e)
        }
    }

    private fun handlePhoneCallState(state: Int) {
        when (state) {
            TelephonyManager.CALL_STATE_RINGING,
            TelephonyManager.CALL_STATE_OFFHOOK -> {
                Log.i(TAG, "Active phone call detected — pausing microphone listening (reason=phone_call_active)")
                isCallActive = true
                micPauseDebounceJob?.cancel()
                pauseListeningForMicInUse("phone_call_active")
            }
            TelephonyManager.CALL_STATE_IDLE -> {
                if (isCallActive) {
                    Log.i(TAG, "Phone call ended — resuming microphone listening with backoff")
                    isCallActive = false
                    resumeListeningAfterMicInUse()
                }
            }
        }
    }

    private fun registerAudioRecordingObserver() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                val audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
                val callback = object : AudioManager.AudioRecordingCallback() {
                    override fun onRecordingConfigChanged(configs: List<AudioRecordingConfiguration>?) {
                        val ourSessionId = wakeWordEngine?.currentAudioSessionId ?: 0
                        val allSessions = configs?.map { it.clientAudioSessionId } ?: emptyList()

                        // Filter out external recording clients:
                        // Only treat real communication/call streams as conflicting. Standard MIC (source 1)
                        // allows concurrent capture on Android 10+ and is also used by Jarvis's own engine.
                        // We only pause if Android explicitly silences our client or if a call/VoIP stream is active.
                        val externalConfigs = configs?.filter { config ->
                            val isOurKnownId = (ourSessionId != 0 && config.clientAudioSessionId == ourSessionId)
                            if (isOurKnownId) return@filter false

                            val isConflictingSource = config.clientAudioSource == MediaRecorder.AudioSource.VOICE_COMMUNICATION ||
                                    config.clientAudioSource == MediaRecorder.AudioSource.VOICE_CALL ||
                                    config.clientAudioSource == MediaRecorder.AudioSource.VOICE_DOWNLINK ||
                                    config.clientAudioSource == MediaRecorder.AudioSource.VOICE_UPLINK

                            isConflictingSource && config.clientAudioSessionId != 0
                        } ?: emptyList()

                        // Check if our own session was silenced by the OS due to concurrent priority capture
                        val isOurSessionSilenced = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            configs?.any { config ->
                                val isOurs = (ourSessionId != 0 && config.clientAudioSessionId == ourSessionId) ||
                                        (config.clientAudioSource == MediaRecorder.AudioSource.MIC && wakeWordEngine?.isRunning == true)
                                isOurs && config.isClientSilenced
                            } ?: false
                        } else {
                            false
                        }

                        Log.d(TAG, "onRecordingConfigChanged: activeSessions=$allSessions, ourSession=$ourSessionId, externalSessions=${externalConfigs.map { it.clientAudioSessionId }}, silenced=$isOurSessionSilenced, state=${currentState.get()}")

                        if ((externalConfigs.isNotEmpty() || isOurSessionSilenced) && !isCallActive && currentState.get() == JarvisState.IDLE_LISTENING) {
                            // Cancel any pending resume debounce
                            micResumeDebounceJob?.cancel()

                            // Debounce pause with 500ms minimum dwell time to eliminate false flapping
                            if (micPauseDebounceJob?.isActive != true) {
                                micPauseDebounceJob = serviceScope.launch {
                                    delay(500L) // Minimum dwell time: condition must persist continuously for 500ms
                                    val am = getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return@launch
                                    val currentConfigs = am.activeRecordingConfigurations
                                    val currentOurSession = wakeWordEngine?.currentAudioSessionId ?: 0

                                    val currentExternal = currentConfigs?.firstOrNull { config ->
                                        val isOurKnownId = (currentOurSession != 0 && config.clientAudioSessionId == currentOurSession)
                                        if (isOurKnownId) return@firstOrNull false

                                        val isConflicting = config.clientAudioSource == MediaRecorder.AudioSource.VOICE_COMMUNICATION ||
                                                config.clientAudioSource == MediaRecorder.AudioSource.VOICE_CALL ||
                                                config.clientAudioSource == MediaRecorder.AudioSource.VOICE_DOWNLINK ||
                                                config.clientAudioSource == MediaRecorder.AudioSource.VOICE_UPLINK

                                        isConflicting && config.clientAudioSessionId != 0
                                    }

                                    val currentSilenced = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                        currentConfigs?.any { config ->
                                            val isOurs = (currentOurSession != 0 && config.clientAudioSessionId == currentOurSession) ||
                                                    (config.clientAudioSource == MediaRecorder.AudioSource.MIC && wakeWordEngine?.isRunning == true)
                                            isOurs && config.isClientSilenced
                                        } ?: false
                                    } else false

                                    if ((currentExternal != null || currentSilenced) && !isCallActive && currentState.get() == JarvisState.IDLE_LISTENING) {
                                        val reason = when {
                                            currentSilenced -> "system_silenced_concurrent_capture"
                                            currentExternal != null -> "external_call_recording:session_${currentExternal.clientAudioSessionId}_source_${currentExternal.clientAudioSource}"
                                            else -> "external_mic_in_use"
                                        }
                                        Log.i(TAG, "External recording confirmed after 500ms dwell time ($reason) — pausing Jarvis")
                                        pauseListeningForMicInUse(reason)
                                    }
                                }
                            }
                        } else if (externalConfigs.isEmpty() && !isOurSessionSilenced) {
                            // If condition cleared before debounce fired, cancel pause!
                            micPauseDebounceJob?.cancel()

                            if (!isCallActive && currentState.get() == JarvisState.PAUSED_MIC_IN_USE) {
                                // Debounce resume: wait 500ms for external app to completely release the audio track
                                if (micResumeDebounceJob?.isActive != true) {
                                    micResumeDebounceJob = serviceScope.launch {
                                        delay(500L)
                                        if (!isCallActive && currentState.get() == JarvisState.PAUSED_MIC_IN_USE) {
                                            Log.i(TAG, "External mic release confirmed after 500ms — resuming Jarvis")
                                            resumeListeningAfterMicInUse()
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                audioRecordingCallback = callback
                audioManager.registerAudioRecordingCallback(callback, mainHandler)
            } catch (e: Exception) {
                Log.w(TAG, "Could not register audio recording callback", e)
            }
        }
    }

    private fun unregisterAudioRecordingObserver() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                val audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
                val cb = audioRecordingCallback as? AudioManager.AudioRecordingCallback ?: return
                audioManager.unregisterAudioRecordingCallback(cb)
            } catch (e: Exception) {
                Log.w(TAG, "Error unregistering audio recording callback", e)
            }
        }
    }

    private fun pauseListeningForMicInUse(reason: String) {
        lastPausedReason = reason
        pausedTimestamp = System.currentTimeMillis()
        Log.i(TAG, "pauseListeningForMicInUse: reason='$reason', currentState=${currentState.get()}")
        if (currentState.get() == JarvisState.PAUSED_MIC_IN_USE) return
        setState(JarvisState.PAUSED_MIC_IN_USE)
        stopWakeWordEngine()
        updateNotification("Jarvis: Paused", reason)
    }

    private fun resumeListeningAfterMicInUse() {
        Log.i(TAG, "Attempting resumeListeningAfterMicInUse (isCallActive=$isCallActive, currentState=${currentState.get()})")
        serviceScope.launch {
            delay(1200L) // Wait for kernel audio driver to reset
            if (!isCallActive && currentState.get() == JarvisState.PAUSED_MIC_IN_USE) {
                lastPausedReason = ""
                pausedTimestamp = 0L
                setState(JarvisState.IDLE_LISTENING)
                updateNotification("Jarvis is listening", "Waiting for \"Hey Jarvis\"…")
                try {
                    startWakeWordEngine()
                    Log.i(TAG, "Successfully resumed wake-word engine after mic release")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to start wake-word engine during resume", e)
                }
            } else {
                Log.i(TAG, "Skipping resume: isCallActive=$isCallActive, currentState=${currentState.get()}")
            }
        }
    }

    private fun startWatchdog() {
        watchdogJob?.cancel()
        watchdogJob = serviceScope.launch {
            while (isActive) {
                delay(4000L) // Run periodic health check every 4 seconds
                try {
                    val state = currentState.get()
                    val now = System.currentTimeMillis()

                    // Watchdog Check 1: Stuck in PAUSED_MIC_IN_USE for >10s without legitimate reason
                    if (state == JarvisState.PAUSED_MIC_IN_USE && pausedTimestamp > 0 && (now - pausedTimestamp > 10000L)) {
                        val audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                        val configs = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                            try {
                                audioManager?.activeRecordingConfigurations
                            } catch (e: Exception) { null }
                        } else null

                        val ourSessionId = wakeWordEngine?.currentAudioSessionId ?: 0
                        val externalRecording = configs?.any { config ->
                            val isOurSession = (ourSessionId != 0 && config.clientAudioSessionId == ourSessionId)
                            !isOurSession && config.clientAudioSessionId != 0
                        } ?: false

                        val callActive = isCallActive || (telephonyManager?.callState != TelephonyManager.CALL_STATE_IDLE)

                        if (!externalRecording && !callActive) {
                            Log.w(TAG, "⚠️ Watchdog fired: Jarvis stuck in PAUSED_MIC_IN_USE for ${(now - pausedTimestamp) / 1000}s with no call or external mic user. Forcing release-and-restart!")
                            lastPausedReason = ""
                            pausedTimestamp = 0L
                            stopWakeWordEngine()
                            delay(400L)
                            setState(JarvisState.IDLE_LISTENING)
                            updateNotification("Jarvis is listening", "Waiting for \"Hey Jarvis\"…")
                            startWakeWordEngine()
                        }
                    }

                    // Watchdog Check 2: Stuck in command capture (WAKE_DETECTED / CAPTURING / TRANSCRIBING) for >15s
                    if (isCapturingCommand.get() && lastCaptureStartTs > 0 && (now - lastCaptureStartTs > 15000L)) {
                        Log.w(TAG, "⚠️ Watchdog fired: Command capture stuck for >15s. Forcing cleanup and return to idle!")
                        finishCaptureAndReturnToIdle(isError = true)
                    }

                    // Watchdog Check 3: In IDLE_LISTENING but wakeWordEngine is null or stopped
                    if (state == JarvisState.IDLE_LISTENING && !isCapturingCommand.get() && (wakeWordEngine == null || wakeWordEngine?.isRunning != true)) {
                        Log.w(TAG, "⚠️ Watchdog fired: IDLE_LISTENING but WakeWordEngine is not running! Reviving wake-word engine…")
                        stopWakeWordEngine()
                        delay(250L)
                        startWakeWordEngine()
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Error in Jarvis watchdog loop", e)
                }
            }
        }
    }

    // ==========================================
    // Charging / Battery Observer
    // ==========================================

    private fun isDeviceCharging(): Boolean {
        return try {
            val batteryStatus: Intent? = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val status = batteryStatus?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
            status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
        } catch (e: Exception) {
            false
        }
    }

    private fun registerPowerObserver() {
        powerReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val action = intent.action ?: return
                if (action == Intent.ACTION_POWER_DISCONNECTED) {
                    if (onlyListenWhileCharging) {
                        Log.i(TAG, "Power disconnected and 'onlyListenWhileCharging' is ON — pausing Jarvis")
                        setState(JarvisState.PAUSED_CHARGING_ONLY)
                        stopWakeWordEngine()
                        updateNotification("Jarvis: Paused (Battery Power)", "Connect charger to resume listening")
                    }
                } else if (action == Intent.ACTION_POWER_CONNECTED) {
                    if (currentState.get() == JarvisState.PAUSED_CHARGING_ONLY) {
                        Log.i(TAG, "Power connected — resuming Jarvis listening")
                        setState(JarvisState.IDLE_LISTENING)
                        updateNotification("Jarvis is listening", "Waiting for \"Hey Jarvis\"…")
                        startWakeWordEngine()
                    }
                }
            }
        }

        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_POWER_CONNECTED)
            addAction(Intent.ACTION_POWER_DISCONNECTED)
        }
        registerReceiver(powerReceiver, filter)
    }

    private fun unregisterPowerObserver() {
        powerReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (e: Exception) {}
            powerReceiver = null
        }
    }

    // ==========================================
    // Proactive Ambient Intelligence
    // ==========================================

    private fun registerAmbientObservers() {
        ambientReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val action = intent.action ?: return
                val now = System.currentTimeMillis()

                // Suppress proactive ambient alerts during calls or active speech capture
                if (isCallActive || isCapturingCommand.get() || currentState.get() == JarvisState.CAPTURING) {
                    return
                }

                when (action) {
                    // 1. HEADPHONES / BLUETOOTH CONNECTED
                    Intent.ACTION_HEADSET_PLUG -> {
                        val state = intent.getIntExtra("state", -1)
                        if (state == 1 && (now - lastAudioLinkAlertTs > 12000L)) {
                            lastAudioLinkAlertTs = now
                            Log.i(TAG, "🎧 Wired headset connected — proactive ambient greeting")
                            playEarcon(ToneGenerator.TONE_PROP_PROMPT, 80)
                            speak("Audio link established, sir. Shall I resume your queue?")
                        }
                    }
                    android.bluetooth.BluetoothDevice.ACTION_ACL_CONNECTED -> {
                        if (now - lastAudioLinkAlertTs > 12000L) {
                            lastAudioLinkAlertTs = now
                            Log.i(TAG, "🎧 Bluetooth audio device connected — proactive ambient greeting")
                            playEarcon(ToneGenerator.TONE_PROP_PROMPT, 80)
                            speak("Audio link established, sir. Shall I resume your queue?")
                        }
                    }

                    // 2. POWER CONNECTED
                    Intent.ACTION_POWER_CONNECTED -> {
                        if (now - lastPowerAlertTs > 6000L) {
                            lastPowerAlertTs = now
                            Log.i(TAG, "⚡ Power connected — proactive alert")
                            speak("Power levels rising, charging initialized at maximum throughput.")
                        }
                    }

                    // 3. POWER DISCONNECTED
                    Intent.ACTION_POWER_DISCONNECTED -> {
                        if (now - lastPowerAlertTs > 6000L) {
                            lastPowerAlertTs = now
                            Log.i(TAG, "🔋 Power disconnected — proactive alert")
                            speak("Power disconnected. We are running on internal battery reserves, sir.")
                        }
                    }

                    // 4. BATTERY CRITICAL (<15%)
                    Intent.ACTION_BATTERY_LOW -> {
                        if (now - lastBatteryCriticalAlertTs > 600000L) { // 10 minutes debounce
                            lastBatteryCriticalAlertTs = now
                            val batteryStatus: Intent? = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
                            val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, 14) ?: 14
                            Log.i(TAG, "⚠️ Battery critical ($level%) — proactive alert")
                            speak("Warning: main power is down to $level percent. I recommend connecting to a power cell.")
                        }
                    }
                }
            }
        }

        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_HEADSET_PLUG)
            addAction(android.bluetooth.BluetoothDevice.ACTION_ACL_CONNECTED)
            addAction(Intent.ACTION_POWER_CONNECTED)
            addAction(Intent.ACTION_POWER_DISCONNECTED)
            addAction(Intent.ACTION_BATTERY_LOW)
        }
        registerReceiver(ambientReceiver, filter)
    }

    private fun unregisterAmbientObservers() {
        ambientReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (e: Exception) {}
            ambientReceiver = null
        }
    }


    // ==========================================
    // Stage 1: Continuous Wake Word Engine
    // ==========================================

    private fun startWakeWordEngine() {
        if (wakeWordEngine != null) {
            if (wakeWordEngine?.isRunning == true) return
            try {
                wakeWordEngine?.start()
                Log.i(TAG, "WakeWordEngine resumed instantly with warm ONNX models (<10ms)")
                return
            } catch (e: Exception) {
                Log.w(TAG, "Failed to resume warm WakeWordEngine, will reinitialize", e)
                try { wakeWordEngine?.release() } catch (_: Exception) {}
                wakeWordEngine = null
            }
        }
        if (isCapturingCommand.get()) {
            Log.w(TAG, "Refusing startWakeWordEngine: command capture is active")
            return
        }
        if (currentState.get() != JarvisState.IDLE_LISTENING) {
            Log.w(TAG, "Refusing startWakeWordEngine: currentState is ${currentState.get()}, not IDLE_LISTENING")
            return
        }

        val models = mutableListOf<WakeWordModel>()
        // Acoustic calibration: "Hey" is a single short syllable evaluated by hey_jarvis.onnx.
        // Its activation peaks around 0.12 - 0.18, so 0.14f ensures immediate activation on "Hey".
        // "Hey Jarvis" and "Hello Jarvis" remain at full benchmark threshold (0.50) so "hello" alone never triggers.
        val heyThreshold = (wakeWordThreshold * 0.28f).coerceIn(0.12f, 0.16f)

        when (selectedWakeModel) {
            "hello_jarvis" -> {
                models.add(WakeWordModel("Hello Jarvis", "hello_jarvis.onnx", threshold = wakeWordThreshold))
                models.add(WakeWordModel("Hey", "hey_jarvis.onnx", threshold = heyThreshold))
            }
            "hey_jarvis" -> {
                models.add(WakeWordModel("Hey Jarvis", "hey_jarvis.onnx", threshold = wakeWordThreshold))
                models.add(WakeWordModel("Hey", "hey_jarvis.onnx", threshold = heyThreshold))
            }
            else -> {
                // "both" / default: load models so "Hey Jarvis", "Hello Jarvis", and "Hey" all wake Jarvis!
                models.add(WakeWordModel("Hey Jarvis", "hey_jarvis.onnx", threshold = wakeWordThreshold))
                models.add(WakeWordModel("Hello Jarvis", "hello_jarvis.onnx", threshold = wakeWordThreshold))
                models.add(WakeWordModel("Hey", "hey_jarvis.onnx", threshold = heyThreshold))
            }
        }

        try {
            wakeWordEngine = WakeWordEngine(
                context = this,
                models = models,
                detectionMode = DetectionMode.SINGLE_BEST,
                detectionCooldownMs = 600L
            )

            wakeWordEngine?.start()
            val loadedNames = models.joinToString { it.name }
            Log.i(TAG, "WakeWordEngine started with models: [$loadedNames], default threshold=$wakeWordThreshold")

            serviceScope.launch {
                wakeWordEngine?.detections?.collectLatest { detection ->
                    if (currentState.get() == JarvisState.IDLE_LISTENING) {
                        // Prevent acoustic self-triggering: if Jarvis TTS is speaking out of phone speaker
                        if (ttsHelper?.isSpeaking == true) {
                            if (!allowBargeIn) {
                                Log.d(TAG, "Barge-in disabled: ignoring wake detection during TTS playback")
                                return@collectLatest
                            }
                            // Speaker echo guard: require deliberate high-confidence speech (>= 0.70f) to interrupt TTS
                            if (detection.score < 0.70f) {
                                Log.d(TAG, "Suppressed speaker echo detection (${detection.score} < 0.70) while TTS is speaking")
                                return@collectLatest
                            }
                            Log.i(TAG, "⚡ High-confidence voice barge-in detected (${detection.score} >= 0.70) — interrupting TTS")
                            ttsHelper?.stop()
                        }
                        Log.i(TAG, "🎤 Wake word detected: '${detection.model.name}' with score ${detection.score}")
                        handleWakeWordDetected(detection.model.name, detection.score)
                    }
                }
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "RECORD_AUDIO permission was revoked while service was running", e)
            onCommandError?.invoke("mic_permission_revoked")
            updateNotification("Jarvis: Needs Permission", "Microphone permission was revoked")
            stopSelf()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start wake-word engine — scheduling auto-recovery retry in 2000ms", e)
            serviceScope.launch {
                delay(2000L)
                if (currentState.get() == JarvisState.IDLE_LISTENING && wakeWordEngine == null) {
                    Log.i(TAG, "Retrying wake-word engine initialization…")
                    startWakeWordEngine()
                }
            }
        }
    }

    private fun stopWakeWordEngine() {
        try {
            wakeWordEngine?.release()
        } catch (e: Exception) {
            Log.w(TAG, "Error releasing wake-word engine", e)
        }
        wakeWordEngine = null
    }

    // ==========================================
    // Stage 2: Voice Command Capture & STT
    // ==========================================

    private fun handleWakeWordDetected(modelName: String, score: Float) {
        // Atomic guard to prevent re-entrant triggers
        if (!isCapturingCommand.compareAndSet(false, true)) {
            Log.w(TAG, "Wake word triggered but command capture is already active")
            return
        }

        wakeDetectedTs = System.currentTimeMillis()
        lastWakeModelName = modelName
        hasRetriedCapture = false
        logTimeline("WAKE_DETECTED", mapOf("model" to modelName, "score" to score.toDouble()))

        // Stop any active TTS immediately if user barged in
        ttsHelper?.stop()

        lastCaptureStartTs = wakeDetectedTs
        setState(JarvisState.WAKE_DETECTED)
        onWakeWordDetected?.invoke(modelName, score)
        updateNotification("Jarvis: Listening…", "Speak your command")

        // 1. Duck background music asynchronously (do not block recognizer startup!)
        serviceScope.launch {
            requestTransientAudioFocus()
            logTimeline("AUDIO_FOCUS_REQUESTED", mapOf("mode" to "TRANSIENT_MAY_DUCK"))
        }

        // 2. Immediately release wake-word AudioRecord so mic is completely free
        stopWakeWordEngine()
        logTimeline("AUDIO_RECORD_RELEASED")

        // 3. Command capture safety watchdog: guarantees return to idle after at most 14s
        captureSafetyWatchdogJob?.cancel()
        captureSafetyWatchdogJob = serviceScope.launch {
            delay(14000L)
            if (isCapturingCommand.get()) {
                Log.w(TAG, "⚠️ Command capture safety watchdog timeout after 14s — forcing return to idle")
                logTimeline("WATCHDOG_TIMEOUT_FORCE_IDLE")
                finishCaptureAndReturnToIdle(isError = true)
            }
        }

        // 4. Start SpeechRecognizer IMMEDIATELY on the Main looper (Earcon will play in onReadyForSpeech!)
        mainHandler.post {
            startSpeechRecognition(silenceTimeoutMs = 8000L)
        }
    }

    private fun startSpeechRecognition(silenceTimeoutMs: Long = 8000L, useFallbackLang: Boolean = false) {
        val sessionId = captureSessionId.incrementAndGet()

        // Destroy any stale instance on Main looper before creating new one
        try {
            speechRecognizer?.destroy()
        } catch (e: Exception) {}
        speechRecognizer = null

        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            Log.e(TAG, "SpeechRecognizer is NOT available on this device")
            logTimeline("RECOGNIZER_UNAVAILABLE")
            onCommandError?.invoke("recognizer_unavailable")
            finishCaptureAndReturnToIdle(isError = true)
            return
        }

        try {
            // Query and log available recognition service packages
            val recognitionIntent = Intent(RecognitionService.SERVICE_INTERFACE)
            val availableServices = packageManager.queryIntentServices(recognitionIntent, 0)
            val servicePackageNames = availableServices.map { "${it.serviceInfo.packageName}/${it.serviceInfo.name}" }
            val defaultPkg = availableServices.firstOrNull()?.serviceInfo?.packageName ?: "system_default"

            logTimeline("RECOGNIZER_INIT_START", mapOf(
                "available_services" to servicePackageNames,
                "use_fallback_lang" to useFallbackLang
            ))

            val recognizer = SpeechRecognizer.createSpeechRecognizer(this)
            speechRecognizer = recognizer
            hasStartedSpeaking.set(false)
            latestTranscript = ""

            logTimeline("RECOGNIZER_CREATED", mapOf(
                "service_package" to defaultPkg,
                "services_count" to availableServices.size
            ))

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                if (!useFallbackLang) {
                    val langTag = when (preferredLanguage) {
                        "hi-IN" -> "hi-IN"
                        else -> "en-IN" // Clean en-IN preserves 100% accuracy for plain English and Indian English
                    }
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, langTag)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, langTag)

                    // Only inject bilingual switching hints if Hindi is explicitly chosen
                    if (preferredLanguage == "hi-IN") {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            putExtra("android.speech.extra.ENABLE_MULTILINGUAL_DETECTION", true)
                            putExtra("android.speech.extra.LANGUAGE_DETECTION_ALLOWED_LANGUAGES", arrayListOf("hi-IN", "en-IN"))
                        }
                        putExtra("android.speech.extra.ADDITIONAL_LANGUAGES", arrayOf("hi-IN", "en-IN"))
                    }
                }
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                // Note: EXTRA_PREFER_OFFLINE omitted to allow online or offline recognition without error 13
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)

                // Ultra-low latency timeouts: finalize immediately after user finishes speaking
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 300L)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 750L)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 500L)
            }

            recognizer.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {
                    if (captureSessionId.get() != sessionId || !isCapturingCommand.get()) return
                    val gapMs = if (wakeDetectedTs > 0) System.currentTimeMillis() - wakeDetectedTs else 0L
                    Log.i(TAG, "STT onReadyForSpeech — listening for speech (gap: ${gapMs}ms, fallback: $useFallbackLang)")
                    setState(JarvisState.CAPTURING)

                    // Step 2a: Play earcon beep and trigger haptic pulse AFTER onReadyForSpeech
                    playEarcon(ToneGenerator.TONE_PROP_BEEP, 120)
                    triggerVibration(80)

                    logTimeline("ON_READY_FOR_SPEECH", mapOf(
                        "wake_to_ready_gap_ms" to gapMs,
                        "earcon_played" to true,
                        "fallback_lang" to useFallbackLang
                    ))

                    // Step 2b: 8-second no-speech timeout counted from onReadyForSpeech
                    startCaptureTimers(silenceTimeoutMs = silenceTimeoutMs)
                }

                override fun onBeginningOfSpeech() {
                    if (captureSessionId.get() != sessionId || !isCapturingCommand.get()) return
                    val gapFromWakeMs = if (wakeDetectedTs > 0) System.currentTimeMillis() - wakeDetectedTs else 0L
                    Log.i(TAG, "STT onBeginningOfSpeech — user began speaking (+${gapFromWakeMs}ms from wake)")
                    hasStartedSpeaking.set(true)
                    noSpeechJob?.cancel()
                    logTimeline("ON_BEGINNING_OF_SPEECH", mapOf("elapsed_from_wake_ms" to gapFromWakeMs))
                }

                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}

                override fun onEndOfSpeech() {
                    if (captureSessionId.get() != sessionId || !isCapturingCommand.get()) return
                    Log.i(TAG, "STT onEndOfSpeech — transcribing speech…")
                    setState(JarvisState.TRANSCRIBING)
                    updateNotification("Jarvis: Transcribing…", "Converting speech to text…")
                    logTimeline("ON_END_OF_SPEECH")
                }

                override fun onError(error: Int) {
                    if (captureSessionId.get() != sessionId || !isCapturingCommand.get()) return
                    val errorName = when (error) {
                        SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "ERROR_NETWORK_TIMEOUT"
                        SpeechRecognizer.ERROR_NETWORK -> "ERROR_NETWORK"
                        SpeechRecognizer.ERROR_AUDIO -> "ERROR_AUDIO"
                        SpeechRecognizer.ERROR_SERVER -> "ERROR_SERVER"
                        SpeechRecognizer.ERROR_CLIENT -> "ERROR_CLIENT"
                        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "ERROR_SPEECH_TIMEOUT"
                        SpeechRecognizer.ERROR_NO_MATCH -> "ERROR_NO_MATCH"
                        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "ERROR_RECOGNIZER_BUSY"
                        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "ERROR_INSUFFICIENT_PERMISSIONS"
                        SpeechRecognizer.ERROR_TOO_MANY_REQUESTS -> "ERROR_TOO_MANY_REQUESTS"
                        SpeechRecognizer.ERROR_SERVER_DISCONNECTED -> "ERROR_SERVER_DISCONNECTED"
                        SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED -> "ERROR_LANGUAGE_NOT_SUPPORTED"
                        SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "ERROR_LANGUAGE_UNAVAILABLE"
                        SpeechRecognizer.ERROR_CANNOT_CHECK_SUPPORT -> "ERROR_CANNOT_CHECK_SUPPORT"
                        else -> "ERROR_UNKNOWN"
                    }

                    val reason = when (error) {
                        SpeechRecognizer.ERROR_NO_MATCH,
                        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "no_speech"
                        SpeechRecognizer.ERROR_AUDIO,
                        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "mic_busy"
                        else -> "other"
                    }

                    val speechStarted = hasStartedSpeaking.get()
                    Log.w(TAG, "STT onError: code=$error ($errorName) mappedReason=$reason speechStarted=$speechStarted")
                    logTimeline("ON_ERROR", mapOf(
                        "error_code" to error,
                        "error_name" to errorName,
                        "mapped_reason" to reason,
                        "speech_started" to speechStarted
                    ))

                    // Step 2d: If language unavailable/not supported or server disconnected, fallback to system default locale retry ONCE
                    val isRecoverableServiceError = (error == SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE || 
                                                     error == SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED ||
                                                     error == SpeechRecognizer.ERROR_SERVER_DISCONNECTED)
                    if (isRecoverableServiceError && !hasRetriedCapture && isCapturingCommand.get()) {
                        hasRetriedCapture = true
                        Log.w(TAG, "SpeechRecognizer recoverable error ($errorName) — retrying with system default language fallback")
                        logTimeline("LANGUAGE_FALLBACK_RETRY", mapOf("previous_error" to errorName))
                        try {
                            speechRecognizer?.destroy()
                        } catch (e: Exception) {}
                        speechRecognizer = null
                        serviceScope.launch(Dispatchers.Main) {
                            delay(150L) // Crucial: allow OS binder service time to fully unbind
                            if (isCapturingCommand.get()) {
                                startSpeechRecognition(silenceTimeoutMs = 8000L, useFallbackLang = true)
                            }
                        }
                        return
                    }

                    // Step 2e: If NO_MATCH or SPEECH_TIMEOUT before speech started:
                    // If user triggered wake word ("Hey", "Hey Jarvis", "Hello Jarvis") to get attention and paused,
                    // Jarvis replies verbally with greeting acknowledgment and continues listening for the command.
                    val isNoSpeechOrNoMatch = (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT)
                    if (isNoSpeechOrNoMatch && !speechStarted && !hasRetriedCapture && isCapturingCommand.get()) {
                        hasRetriedCapture = true
                        logTimeline("AUTO_RETRY_INITIATED", mapOf("previous_error" to errorName, "wake_model" to lastWakeModelName))
                        Log.i(TAG, "STT silence timeout after wake word '$lastWakeModelName' — replying with greeting acknowledgment")
                        playEarcon(ToneGenerator.TONE_PROP_PROMPT, 100)

                        val isGreetingWake = lastWakeModelName.contains("Hey", ignoreCase = true) ||
                                             lastWakeModelName.contains("Hello", ignoreCase = true) ||
                                             lastWakeModelName.contains("Jarvis", ignoreCase = true)

                        val ackText = if (isGreetingWake) {
                            val replies = listOf(
                                "At your service, sir. What can I do for you?",
                                "Yes boss, listening.",
                                "Online and ready, sir.",
                                "Haanji sir, boliye kya kaam hai?"
                            )
                            replies.random()
                        } else {
                            "I didn't catch that"
                        }

                        ttsHelper?.speak(ackText, null)

                        serviceScope.launch {
                            delay(2200L) // Wait for greeting speech before reopening recognizer
                            if (isCapturingCommand.get()) {
                                mainHandler.post {
                                    startSpeechRecognition(silenceTimeoutMs = 6000L)
                                }
                            }
                        }
                        return
                    }

                    onCommandError?.invoke(reason)
                    finishCaptureAndReturnToIdle(isError = true)
                }

                override fun onResults(results: Bundle?) {
                    if (captureSessionId.get() != sessionId || !isCapturingCommand.get()) return
                    val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    val confidences = results?.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES)
                    val text = matches?.firstOrNull()?.trim() ?: latestTranscript
                    val confidence = confidences?.firstOrNull()

                    Log.i(TAG, "STT onResults: '$text' (confidence: $confidence)")
                    logTimeline("ON_RESULTS", mapOf(
                        "text" to text,
                        "confidence" to (confidence?.toDouble() ?: 0.0)
                    ))

                    if (text.isNotBlank()) {
                        serviceScope.launch {
                            val nativeResult = CommandRegistry.executeIfMatched(applicationContext, text)
                            if (nativeResult != null) {
                                Log.i(TAG, "⚡ Native command executed (<50ms): ${nativeResult.actionId}, reply='${nativeResult.spokenReply}'")
                                speak(nativeResult.spokenReply)
                                onCommandTranscript?.invoke(text, true, confidence, true)
                                onNativeCommandExecuted?.invoke(nativeResult.actionId, nativeResult.spokenReply, nativeResult.success)
                            } else {
                                Log.i(TAG, "Forwarding to JS pipeline: '$text'")
                                onCommandTranscript?.invoke(text, true, confidence, false)
                            }
                        }
                        finishCaptureAndReturnToIdle(isError = false)
                    } else {
                        onCommandError?.invoke("no_speech")
                        finishCaptureAndReturnToIdle(isError = true)
                    }
                }

                override fun onPartialResults(partialResults: Bundle?) {
                    if (captureSessionId.get() != sessionId || !isCapturingCommand.get()) return
                    val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    val partialText = matches?.firstOrNull()?.trim() ?: ""
                    if (partialText.isNotBlank()) {
                        latestTranscript = partialText
                        logTimeline("ON_PARTIAL_RESULTS", mapOf("text" to partialText))
                        onCommandTranscript?.invoke(partialText, false, null, false)
                    }
                }

                override fun onEvent(eventType: Int, params: Bundle?) {}
            })

            logTimeline("START_LISTENING_CALLED")
            recognizer.startListening(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start SpeechRecognizer", e)
            logTimeline("RECOGNIZER_START_EXCEPTION", mapOf("exception" to (e.message ?: "unknown")))
            onCommandError?.invoke("other")
            finishCaptureAndReturnToIdle(isError = true)
        }
    }

    private fun startCaptureTimers(silenceTimeoutMs: Long = 8000L) {
        noSpeechJob?.cancel()
        hardCapJob?.cancel()

        noSpeechJob = serviceScope.launch {
            delay(silenceTimeoutMs)
            if (currentState.get() == JarvisState.CAPTURING && !hasStartedSpeaking.get() && isCapturingCommand.get()) {
                Log.w(TAG, "No speech detected within ${silenceTimeoutMs}ms — aborting capture")
                logTimeline("NO_SPEECH_TIMEOUT", mapOf("timeoutMs" to silenceTimeoutMs))
                mainHandler.post {
                    if (!isCapturingCommand.get()) return@post
                    try {
                        speechRecognizer?.stopListening()
                    } catch (e: Exception) {}
                    onCommandError?.invoke("no_speech")
                    finishCaptureAndReturnToIdle(isError = true)
                }
            }
        }

        hardCapJob = serviceScope.launch {
            delay(12000L)
            if ((currentState.get() == JarvisState.CAPTURING || currentState.get() == JarvisState.TRANSCRIBING) && isCapturingCommand.get()) {
                Log.w(TAG, "12-second hard cap reached — finalizing capture")
                logTimeline("HARD_CAP_REACHED")
                mainHandler.post {
                    if (!isCapturingCommand.get()) return@post
                    try {
                        speechRecognizer?.stopListening()
                    } catch (e: Exception) {}
                    if (latestTranscript.isNotBlank()) {
                        onCommandTranscript?.invoke(latestTranscript, true, null, false)
                        finishCaptureAndReturnToIdle(isError = false)
                    } else {
                        onCommandError?.invoke("timeout")
                        finishCaptureAndReturnToIdle(isError = true)
                    }
                }
            }
        }
    }

    private fun finishCaptureAndReturnToIdle(isError: Boolean) {
        captureSessionId.incrementAndGet()
        isCapturingCommand.set(false)
        lastCaptureStartTs = 0L

        captureSafetyWatchdogJob?.cancel()
        noSpeechJob?.cancel()
        hardCapJob?.cancel()

        mainHandler.post {
            try {
                speechRecognizer?.stopListening()
            } catch (e: Exception) {}
            try {
                speechRecognizer?.destroy()
            } catch (e: Exception) {
                Log.w(TAG, "Error destroying speech recognizer", e)
            }
            speechRecognizer = null
        }

        serviceScope.launch {
            try {
                if (isError) {
                    playEarcon(ToneGenerator.TONE_PROP_NACK, 120)
                } else {
                    playEarcon(ToneGenerator.TONE_PROP_ACK, 120)
                }

                abandonTransientAudioFocus()
                setState(JarvisState.COOLDOWN)
                updateNotification("Jarvis is listening", "Waiting for \"Hey Jarvis\"…")
                // Prompt instruction: allow 200ms for OS audio server and speech recognizer to fully release hardware mic
                delay(200L)
            } catch (e: Exception) {
                Log.w(TAG, "Exception during finishCapture cleanup", e)
            } finally {
                // Return to appropriate state depending on charging mode and phone call status
                try {
                    if (onlyListenWhileCharging && !isDeviceCharging()) {
                        setState(JarvisState.PAUSED_CHARGING_ONLY)
                        updateNotification("Jarvis: Paused (Battery Power)", "Connect charger to resume listening")
                    } else if (isCallActive) {
                        lastPausedReason = "phone_call_active"
                        pausedTimestamp = System.currentTimeMillis()
                        setState(JarvisState.PAUSED_MIC_IN_USE)
                        updateNotification("Jarvis: Paused", "Microphone in use (call active)")
                    } else {
                        lastPausedReason = ""
                        pausedTimestamp = 0L
                        setState(JarvisState.IDLE_LISTENING)
                        updateNotification("Jarvis is listening", "Waiting for \"Hey Jarvis\"…")
                        try {
                            startWakeWordEngine()
                            logTimeline("WAKE_WORD_LOOP_RESUMED")
                            Log.i(TAG, "Wake-word engine resumed successfully after command capture cycle")
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to start wake-word engine during finishCapture return to idle", e)
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Unexpected error in finishCapture finally block", e)
                    setState(JarvisState.IDLE_LISTENING)
                }
            }
        }
    }

    // ==========================================
    // Audio Focus & Earcons
    // ==========================================

    private fun requestTransientAudioFocus() {
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build()
                    )
                    .setAcceptsDelayedFocusGain(false)
                    .setOnAudioFocusChangeListener { }
                    .build()
                focusRequest = req
                audioManager.requestAudioFocus(req)
            } else {
                @Suppress("DEPRECATION")
                audioManager.requestAudioFocus(
                    null,
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
                )
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to request transient audio focus", e)
        }
    }

    private fun abandonTransientAudioFocus() {
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
                focusRequest = null
            } else {
                @Suppress("DEPRECATION")
                audioManager.abandonAudioFocus(null)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to abandon transient audio focus", e)
        }
    }

    private fun playEarcon(toneType: Int, durationMs: Int) {
        try {
            val toneGenerator = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80)
            toneGenerator.startTone(toneType, durationMs)
            serviceScope.launch {
                delay(durationMs.toLong() + 50)
                try {
                    toneGenerator.release()
                } catch (e: Exception) {}
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to play earcon tone", e)
        }
    }

    private fun triggerVibration(durationMs: Long) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator?.vibrate(
                    VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE)
                )
            } else {
                @Suppress("DEPRECATION")
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator?.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(durationMs)
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to trigger vibration", e)
        }
    }

    // ==========================================
    // Foreground Notification
    // ==========================================

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Jarvis Wake Word Listener",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Persistent notification while Jarvis is listening for wake words"
                setShowBadge(false)
            }
            notificationManager?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(title: String, text: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingLaunch = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, JarvisListenerService::class.java).apply {
            action = ACTION_STOP
        }
        val pendingStop = PendingIntent.getService(
            this, 1, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setContentIntent(pendingLaunch)
            .addAction(
                android.R.drawable.ic_media_pause,
                "Stop Listening",
                pendingStop
            )
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    // ==========================================
    // Multi-turn Follow-up & TTS Controls
    // ==========================================

    fun startFollowUpCapture(timeoutMs: Long = 5000L) {
        ttsHelper?.stop()

        if (!isCapturingCommand.compareAndSet(false, true)) {
            Log.w(TAG, "Cannot start follow-up capture: microphone is already capturing")
            return
        }

        Log.i(TAG, "🔄 Starting follow-up capture (${timeoutMs}ms) without requiring wake word")
        setState(JarvisState.WAKE_DETECTED)
        updateNotification("Jarvis: Listening…", "Waiting for your answer…")

        requestTransientAudioFocus()
        playEarcon(ToneGenerator.TONE_PROP_BEEP, 80)
        triggerVibration(60)

        stopWakeWordEngine()

        mainHandler.post {
            startSpeechRecognition(silenceTimeoutMs = timeoutMs)
        }
    }

    fun speak(text: String, onDone: (() -> Unit)? = null) {
        val state = currentState.get()
        if (state == JarvisState.CAPTURING) {
            Log.w(TAG, "Speak rejected: microphone capture is actively recording ($state)")
            onDone?.invoke()
            return
        }
        ttsHelper?.speak(text, onDone)
    }

    fun stopSpeaking() {
        ttsHelper?.stop()
    }

    fun setTtsSettings(voiceRepliesEnabled: Boolean, beepOnly: Boolean) {
        ttsHelper?.voiceRepliesEnabled = voiceRepliesEnabled
        ttsHelper?.beepOnly = beepOnly
        Log.i(TAG, "TTS settings updated: voiceReplies=$voiceRepliesEnabled, beepOnly=$beepOnly")
    }

    fun setVoicePersona(persona: String) {
        selectedVoicePersona = persona
        ttsHelper?.setVoicePersona(persona)
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString("voice_persona", persona).apply()
        Log.i(TAG, "Voice persona updated to: $persona")
    }

    fun setChargingOnlyMode(enabled: Boolean) {
        onlyListenWhileCharging = enabled
        Log.i(TAG, "Charging-only listening updated to: $enabled")

        if (enabled && !isDeviceCharging() && currentState.get() == JarvisState.IDLE_LISTENING) {
            setState(JarvisState.PAUSED_CHARGING_ONLY)
            stopWakeWordEngine()
            updateNotification("Jarvis: Paused (Battery Power)", "Connect charger to resume listening")
        } else if (!enabled && currentState.get() == JarvisState.PAUSED_CHARGING_ONLY) {
            setState(JarvisState.IDLE_LISTENING)
            updateNotification("Jarvis is listening", "Waiting for \"Hey Jarvis\"…")
            startWakeWordEngine()
        }
    }

    fun updateWakeModel(modelKey: String) {
        selectedWakeModel = modelKey
        Log.i(TAG, "Active wake word model changed to: $modelKey (current state: ${currentState.get()})")
        if (currentState.get() == JarvisState.IDLE_LISTENING || currentState.get() == JarvisState.PAUSED_MIC_IN_USE) {
            if (currentState.get() == JarvisState.PAUSED_MIC_IN_USE && !isCallActive) {
                Log.i(TAG, "User switched wake model while paused — resetting state to IDLE_LISTENING")
                lastPausedReason = ""
                pausedTimestamp = 0L
                setState(JarvisState.IDLE_LISTENING)
            }
            stopWakeWordEngine()
            startWakeWordEngine()
        }
    }

    fun forceResetListening() {
        Log.i(TAG, "Force resetting Jarvis listener service state and audio engine")
        lastPausedReason = ""
        pausedTimestamp = 0L
        isCapturingCommand.set(false)
        lastCaptureStartTs = 0L
        captureSafetyWatchdogJob?.cancel()
        noSpeechJob?.cancel()
        hardCapJob?.cancel()

        mainHandler.post {
            try {
                speechRecognizer?.stopListening()
            } catch (e: Exception) {}
            try {
                speechRecognizer?.destroy()
            } catch (e: Exception) {}
            speechRecognizer = null
        }

        stopWakeWordEngine()
        serviceScope.launch {
            delay(350L)
            setState(JarvisState.IDLE_LISTENING)
            updateNotification("Jarvis is listening", "Waiting for \"Hey Jarvis\"…")
            startWakeWordEngine()
        }
    }
}
