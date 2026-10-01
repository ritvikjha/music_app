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

        /** Allow barge-in during TTS (defaults to false to prevent speaker echo loops) */
        @Volatile
        var allowBargeIn: Boolean = false

        /** Settings: Only listen when phone is connected to charger */
        @Volatile
        var onlyListenWhileCharging: Boolean = false

        /** Settings: Preferred STT recognition language (en-IN, hi-IN, auto) */
        @Volatile
        var preferredLanguage: String = "en-IN"

        /** Settings: Active wake word model ("hey_jarvis" or "hello_jarvis") */
        @Volatile
        var selectedWakeModel: String = "hey_jarvis"

        /** Callbacks set by the Expo Module bridge */
        var onWakeWordDetected: ((modelName: String, score: Float) -> Unit)? = null
        var onJarvisStateChanged: ((state: JarvisState) -> Unit)? = null
        var onCommandTranscript: ((text: String, isFinal: Boolean, confidence: Float?, nativeHandled: Boolean) -> Unit)? = null
        var onCommandError: ((reason: String) -> Unit)? = null
        var onNativeCommandExecuted: ((actionId: String, spokenReply: String, success: Boolean) -> Unit)? = null
        var onSpeechDone: ((utteranceId: String) -> Unit)? = null
    }

    private var wakeWordEngine: WakeWordEngine? = null
    private var speechRecognizer: SpeechRecognizer? = null
    private var ttsHelper: JarvisTtsHelper? = null
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val mainHandler = Handler(Looper.getMainLooper())

    private val currentState = AtomicReference(JarvisState.IDLE_LISTENING)
    private val isCapturingCommand = AtomicBoolean(false)
    private val hasStartedSpeaking = AtomicBoolean(false)
    private var latestTranscript: String = ""

    private var noSpeechJob: Job? = null
    private var hardCapJob: Job? = null

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

        // Register telephony and audio listeners for mic conflicts
        registerTelephonyObserver()
        registerAudioRecordingObserver()
        registerPowerObserver()
        registerAmbientObservers()
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

    private fun setState(newState: JarvisState) {
        val oldState = currentState.getAndSet(newState)
        if (oldState != newState) {
            Log.i(TAG, "Jarvis state transition: $oldState -> $newState")
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
                Log.i(TAG, "Active phone call detected — pausing microphone listening")
                isCallActive = true
                pauseListeningForMicInUse("Microphone in use (call active)")
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
                        val otherAppRecording = configs?.any { config ->
                            config.clientAudioSessionId != 0
                        } ?: false

                        if (otherAppRecording && !isCallActive && currentState.get() == JarvisState.IDLE_LISTENING) {
                            Log.i(TAG, "Another app claimed the microphone — pausing Jarvis")
                            pauseListeningForMicInUse("Microphone in use by another app")
                        } else if (!otherAppRecording && !isCallActive && currentState.get() == JarvisState.PAUSED_MIC_IN_USE) {
                            Log.i(TAG, "Other app released microphone — resuming Jarvis")
                            resumeListeningAfterMicInUse()
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
        if (currentState.get() == JarvisState.PAUSED_MIC_IN_USE) return
        setState(JarvisState.PAUSED_MIC_IN_USE)
        stopWakeWordEngine()
        updateNotification("Jarvis: Paused", reason)
    }

    private fun resumeListeningAfterMicInUse() {
        serviceScope.launch {
            delay(1500L) // Wait for kernel audio driver to reset
            if (!isCallActive && currentState.get() == JarvisState.PAUSED_MIC_IN_USE) {
                setState(JarvisState.IDLE_LISTENING)
                updateNotification("Jarvis is listening", "Waiting for \"Hey Jarvis\"…")
                startWakeWordEngine()
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
        if (wakeWordEngine != null) return

        val isHello = selectedWakeModel.contains("hello")
        val modelAsset = if (isHello) "hello_jarvis.onnx" else "hey_jarvis.onnx"
        val modelDisplayName = if (isHello) "Hello Jarvis" else "Hey Jarvis"

        val models = listOf(
            WakeWordModel(
                name = modelDisplayName,
                assetPath = modelAsset,
                threshold = wakeWordThreshold
            )
        )

        try {
            wakeWordEngine = WakeWordEngine(
                context = this,
                models = models,
                detectionMode = DetectionMode.SINGLE_BEST,
                detectionCooldownMs = 2000L
            )

            wakeWordEngine?.start()
            Log.i(TAG, "WakeWordEngine started ($modelDisplayName, asset=$modelAsset, threshold=$wakeWordThreshold)")

            serviceScope.launch {
                wakeWordEngine?.detections?.collectLatest { detection ->
                    if (currentState.get() == JarvisState.IDLE_LISTENING) {
                        // Prevent acoustic self-triggering: if Jarvis TTS is speaking and allowBargeIn is false, ignore detection
                        if (ttsHelper?.isSpeaking == true && !allowBargeIn) {
                            Log.d(TAG, "Ignoring wake detection during active TTS speech to prevent speaker echo self-triggering")
                            return@collectLatest
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
        // Stop any active TTS immediately if user barged in
        ttsHelper?.stop()

        // Atomic guard to prevent re-entrant triggers
        if (!isCapturingCommand.compareAndSet(false, true)) {
            Log.w(TAG, "Wake word triggered but command capture is already active")
            return
        }

        setState(JarvisState.WAKE_DETECTED)
        onWakeWordDetected?.invoke(modelName, score)
        updateNotification("Jarvis: Listening…", "Speak your command")

        // 1. Duck background music so user's voice is not drowned
        requestTransientAudioFocus()

        // 2. Play feedback earcon and trigger haptic pulse
        playEarcon(ToneGenerator.TONE_PROP_BEEP, 150)
        triggerVibration(100)

        // 3. Release wake-word AudioRecord so SpeechRecognizer can exclusively own the mic
        stopWakeWordEngine()

        // 4. Start SpeechRecognizer on the Main looper
        mainHandler.post {
            startSpeechRecognition()
        }
    }

    private fun startSpeechRecognition(silenceTimeoutMs: Long = 6000L) {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            Log.e(TAG, "SpeechRecognizer is NOT available on this device")
            onCommandError?.invoke("recognizer_unavailable")
            finishCaptureAndReturnToIdle(isError = true)
            return
        }

        try {
            val recognizer = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                SpeechRecognizer.isOnDeviceRecognitionAvailable(this)
            ) {
                Log.i(TAG, "Creating on-device SpeechRecognizer (Android 13+)")
                SpeechRecognizer.createOnDeviceSpeechRecognizer(this)
            } else {
                Log.i(TAG, "Creating system SpeechRecognizer")
                SpeechRecognizer.createSpeechRecognizer(this)
            }

            speechRecognizer = recognizer
            hasStartedSpeaking.set(false)
            latestTranscript = ""

            // Respect user's preferred language setting
            val langTag = when (preferredLanguage) {
                "hi-IN" -> "hi-IN"
                "auto" -> "en-IN" // en-IN handles Indian English & Hinglish best
                else -> "en-IN"
            }

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, langTag)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, langTag)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 1500L)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1500L)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1500L)
            }

            recognizer.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {
                    Log.i(TAG, "STT onReadyForSpeech — listening for speech (lang: $langTag)")
                    setState(JarvisState.CAPTURING)
                    startCaptureTimers(silenceTimeoutMs)
                }

                override fun onBeginningOfSpeech() {
                    Log.i(TAG, "STT onBeginningOfSpeech — user began speaking")
                    hasStartedSpeaking.set(true)
                    noSpeechJob?.cancel()
                }

                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}

                override fun onEndOfSpeech() {
                    Log.i(TAG, "STT onEndOfSpeech — transcribing speech…")
                    setState(JarvisState.TRANSCRIBING)
                    updateNotification("Jarvis: Transcribing…", "Converting speech to text…")
                }

                override fun onError(error: Int) {
                    val reason = when (error) {
                        SpeechRecognizer.ERROR_NO_MATCH,
                        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "no_speech"
                        SpeechRecognizer.ERROR_AUDIO,
                        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "mic_busy"
                        else -> "other"
                    }
                    Log.w(TAG, "STT onError: code=$error mappedReason=$reason")
                    onCommandError?.invoke(reason)
                    finishCaptureAndReturnToIdle(isError = true)
                }

                override fun onResults(results: Bundle?) {
                    val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    val confidences = results?.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES)
                    val text = matches?.firstOrNull()?.trim() ?: latestTranscript
                    val confidence = confidences?.firstOrNull()

                    Log.i(TAG, "STT onResults: '$text' (confidence: $confidence)")

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
                    val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    val partialText = matches?.firstOrNull()?.trim() ?: ""
                    if (partialText.isNotBlank()) {
                        latestTranscript = partialText
                        onCommandTranscript?.invoke(partialText, false, null, false)
                    }
                }

                override fun onEvent(eventType: Int, params: Bundle?) {}
            })

            recognizer.startListening(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start SpeechRecognizer", e)
            onCommandError?.invoke("other")
            finishCaptureAndReturnToIdle(isError = true)
        }
    }

    private fun startCaptureTimers(silenceTimeoutMs: Long = 6000L) {
        noSpeechJob?.cancel()
        hardCapJob?.cancel()

        noSpeechJob = serviceScope.launch {
            delay(silenceTimeoutMs)
            if (currentState.get() == JarvisState.CAPTURING && !hasStartedSpeaking.get()) {
                Log.w(TAG, "No speech detected within ${silenceTimeoutMs}ms — aborting capture")
                mainHandler.post {
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
            if (currentState.get() == JarvisState.CAPTURING || currentState.get() == JarvisState.TRANSCRIBING) {
                Log.w(TAG, "12-second hard cap reached — finalizing capture")
                mainHandler.post {
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
        serviceScope.launch {
            try {
                noSpeechJob?.cancel()
                hardCapJob?.cancel()

                mainHandler.post {
                    try {
                        speechRecognizer?.destroy()
                    } catch (e: Exception) {
                        Log.w(TAG, "Error destroying speech recognizer", e)
                    }
                    speechRecognizer = null
                }

                if (isError) {
                    playEarcon(ToneGenerator.TONE_PROP_NACK, 120)
                } else {
                    playEarcon(ToneGenerator.TONE_PROP_ACK, 120)
                }

                abandonTransientAudioFocus()
                setState(JarvisState.COOLDOWN)
                updateNotification("Jarvis is listening", "Waiting for \"Hey Jarvis\"…")
                delay(700L)
            } finally {
                isCapturingCommand.set(false)

                // Return to appropriate state depending on charging mode
                if (onlyListenWhileCharging && !isDeviceCharging()) {
                    setState(JarvisState.PAUSED_CHARGING_ONLY)
                    updateNotification("Jarvis: Paused (Battery Power)", "Connect charger to resume listening")
                } else if (isCallActive) {
                    setState(JarvisState.PAUSED_MIC_IN_USE)
                    updateNotification("Jarvis: Paused", "Microphone in use (call active)")
                } else {
                    startWakeWordEngine()
                    setState(JarvisState.IDLE_LISTENING)
                    updateNotification("Jarvis is listening", "Waiting for \"Hey Jarvis\"…")
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
        if (state == JarvisState.CAPTURING || state == JarvisState.TRANSCRIBING || isCapturingCommand.get()) {
            Log.w(TAG, "Speak rejected: microphone capture is active ($state)")
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
        Log.i(TAG, "Active wake word model changed to: $modelKey")
        if (currentState.get() == JarvisState.IDLE_LISTENING) {
            stopWakeWordEngine()
            startWakeWordEngine()
        }
    }
}
