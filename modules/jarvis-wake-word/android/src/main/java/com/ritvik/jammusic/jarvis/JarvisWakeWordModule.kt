package com.ritvik.jammusic.jarvis

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JarvisWakeWordModule — Expo Module bridge between native Android and React Native JS.
 *
 * Exposes methods to JS:
 *   - startListening(): Starts the foreground service + wake-word engine
 *   - stopListening(): Stops the foreground service
 *   - isBatteryOptimized(): Returns whether the app is battery-restricted
 *   - hasAudioPermission(): Checks RECORD_AUDIO permission
 *   - setWakeSensitivity(threshold): Adjusts wake-word confidence threshold
 *   - getWakeSensitivity(): Returns current threshold
 *
 * Emits events to JS:
 *   - "wakeWordDetected": { modelName: string, score: number }
 *   - "onJarvisState": { state: string }
 *   - "onCommandTranscript": { text: string, isFinal: boolean, confidence?: number }
 *   - "onCommandError": { reason: string }
 */
class JarvisWakeWordModule : Module() {

    companion object {
        private const val TAG = "JarvisModule"
    }

    override fun definition() = ModuleDefinition {
        Name("JarvisWakeWord")

        // Events that JS can subscribe to
        Events("wakeWordDetected", "onJarvisState", "onCommandTranscript", "onCommandError", "onNativeCommandExecuted", "onSpeechDone")

        // Start the Jarvis foreground service
        AsyncFunction("startListening") {
            val context = appContext.reactContext ?: throw Exception("React context not available")

            // Check RECORD_AUDIO permission
            val hasAudioPermission = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED

            if (!hasAudioPermission) {
                throw Exception("RECORD_AUDIO permission not granted. Request it before calling startListening().")
            }

            // Register event routing callbacks from native service -> JS
            JarvisListenerService.onWakeWordDetected = { modelName, score ->
                Log.i(TAG, "Forwarding wake word to JS: $modelName ($score)")
                try {
                    sendEvent("wakeWordDetected", mapOf(
                        "modelName" to modelName,
                        "score" to score.toDouble()
                    ))
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to send wakeWordDetected event to JS", e)
                }
            }

            JarvisListenerService.onJarvisStateChanged = { state ->
                Log.i(TAG, "Forwarding state to JS: ${state.name}")
                try {
                    sendEvent("onJarvisState", mapOf(
                        "state" to state.name
                    ))
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to send onJarvisState event to JS", e)
                }
            }

            JarvisListenerService.onCommandTranscript = { text, isFinal, confidence, nativeHandled ->
                Log.i(TAG, "Forwarding transcript to JS: '$text' (isFinal=$isFinal, nativeHandled=$nativeHandled)")
                try {
                    val map = mutableMapOf<String, Any>(
                        "text" to text,
                        "isFinal" to isFinal,
                        "nativeHandled" to nativeHandled
                    )
                    if (confidence != null) {
                        map["confidence"] = confidence.toDouble()
                    }
                    sendEvent("onCommandTranscript", map)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to send onCommandTranscript event to JS", e)
                }
            }

            JarvisListenerService.onCommandError = { reason ->
                Log.i(TAG, "Forwarding command error to JS: $reason")
                try {
                    sendEvent("onCommandError", mapOf(
                        "reason" to reason
                    ))
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to send onCommandError event to JS", e)
                }
            }

            JarvisListenerService.onNativeCommandExecuted = { actionId, spokenReply, success ->
                Log.i(TAG, "Forwarding onNativeCommandExecuted to JS: $actionId (success=$success)")
                try {
                    sendEvent("onNativeCommandExecuted", mapOf(
                        "actionId" to actionId,
                        "spokenReply" to spokenReply,
                        "success" to success
                    ))
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to send onNativeCommandExecuted event to JS", e)
                }
            }

            JarvisListenerService.onSpeechDone = { utteranceId ->
                Log.d(TAG, "Forwarding onSpeechDone to JS: $utteranceId")
                try {
                    sendEvent("onSpeechDone", mapOf(
                        "utteranceId" to utteranceId
                    ))
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to send onSpeechDone event to JS", e)
                }
            }

            // Start the foreground service
            val serviceIntent = Intent(context, JarvisListenerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }

            Log.i(TAG, "Jarvis listener service started")

            // Log battery optimization status
            val isOptimized = BatteryOptimizationHelper.isBatteryOptimized(context)
            if (isOptimized) {
                Log.w(TAG, "⚠️ App is battery-optimized — background listening may be restricted")
            }
        }

        // Stop the Jarvis foreground service
        AsyncFunction("stopListening") {
            val context = appContext.reactContext ?: throw Exception("React context not available")

            JarvisListenerService.onWakeWordDetected = null
            JarvisListenerService.onJarvisStateChanged = null
            JarvisListenerService.onCommandTranscript = null
            JarvisListenerService.onCommandError = null
            JarvisListenerService.onNativeCommandExecuted = null
            JarvisListenerService.onSpeechDone = null

            val serviceIntent = Intent(context, JarvisListenerService::class.java)
            context.stopService(serviceIntent)

            Log.i(TAG, "Jarvis listener service stopped")
        }

        // Adjust wake sensitivity threshold (0.01 - 0.99)
        Function("setWakeSensitivity") { threshold: Double ->
            val clamped = threshold.coerceIn(0.01, 0.99).toFloat()
            JarvisListenerService.wakeWordThreshold = clamped
            Log.i(TAG, "Wake sensitivity updated to $clamped")
        }

        // Get current wake sensitivity threshold
        Function("getWakeSensitivity") {
            JarvisListenerService.wakeWordThreshold.toDouble()
        }

        // Check if the app is battery-optimized (returns true if restricted)
        Function("isBatteryOptimized") {
            val context = appContext.reactContext ?: return@Function false
            BatteryOptimizationHelper.isBatteryOptimized(context)
        }

        // Check if RECORD_AUDIO permission is currently granted
        Function("hasAudioPermission") {
            val context = appContext.reactContext ?: return@Function false
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED
        }

        // Set Android system media volume (0 - 100 percent)
        Function("setSystemVolume") { percent: Int ->
            val context = appContext.reactContext ?: return@Function
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return@Function
            val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val target = (percent.coerceIn(0, 100) * maxVolume) / 100
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, target, AudioManager.FLAG_SHOW_UI)
        }

        // Get current Android system media volume (0 - 100 percent)
        Function("getSystemVolume") {
            val context = appContext.reactContext ?: return@Function 50
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return@Function 50
            val current = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
            val max = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            if (max == 0) 50 else (current * 100) / max
        }

        // Direct native command execution tester
        AsyncFunction("executeNativeCommand") { text: String ->
            val context = appContext.reactContext ?: throw Exception("React context not available")
            val res = CommandRegistry.executeIfMatched(context, text)
            if (res != null) {
                mapOf(
                    "matched" to true,
                    "actionId" to res.actionId,
                    "spokenReply" to res.spokenReply,
                    "success" to res.success,
                    "error" to (res.error ?: "")
                )
            } else {
                mapOf(
                    "matched" to false,
                    "actionId" to "",
                    "spokenReply" to "",
                    "success" to false,
                    "error" to "NOT_A_NATIVE_COMMAND"
                )
            }
        }

        // Toggle Flashlight directly
        Function("toggleFlashlight") {
            val context = appContext.reactContext ?: return@Function false
            val res = com.ritvik.jammusic.jarvis.handlers.FlashlightHandler.toggleFlashlight(context)
            res.success
        }

        // Query Flashlight status
        Function("isFlashlightOn") {
            com.ritvik.jammusic.jarvis.handlers.FlashlightHandler.isEnabled()
        }

        // ==========================================
        // Text-To-Speech & Multi-Turn Controls
        // ==========================================

        // Speak text using on-device TextToSpeech
        AsyncFunction("speak") { text: String ->
            val service = JarvisListenerService.instance
            if (service != null) {
                service.speak(text)
            } else {
                val context = appContext.reactContext ?: return@AsyncFunction
                val helper = JarvisTtsHelper(context)
                helper.speak(text)
            }
        }

        // Stop active speech synthesis
        Function("stopSpeaking") {
            JarvisListenerService.instance?.stopSpeaking()
        }

        // Start follow-up capture (~5s) without requiring wake word
        AsyncFunction("startFollowUpCapture") { timeoutMs: Double ->
            val timeout = if (timeoutMs > 0) timeoutMs.toLong() else 5000L
            JarvisListenerService.instance?.startFollowUpCapture(timeout)
        }

        // Update TTS settings (voice replies, beep only)
        Function("setTtsSettings") { voiceRepliesEnabled: Boolean, beepOnly: Boolean ->
            JarvisListenerService.instance?.setTtsSettings(voiceRepliesEnabled, beepOnly)
        }

        // Toggle barge-in support (stopping TTS on wake word detection)
        Function("setBargeInEnabled") { enabled: Boolean ->
            JarvisListenerService.allowBargeIn = enabled
        }

        // ==========================================
        // Device, Battery & Resilience Controls
        // ==========================================

        Function("getDeviceManufacturer") {
            Build.MANUFACTURER ?: "unknown"
        }

        Function("getDeviceModel") {
            Build.MODEL ?: "unknown"
        }

        Function("openOemAutostartSettings") {
            val context = appContext.reactContext ?: return@Function false
            BatteryOptimizationHelper.openOemAutostartSettings(context)
        }

        Function("requestIgnoreBatteryOptimizations") {
            val context = appContext.reactContext ?: return@Function false
            BatteryOptimizationHelper.requestIgnoreBatteryOptimizations(context)
        }

        Function("openBatteryOptimizationSettings") {
            val context = appContext.reactContext ?: return@Function false
            BatteryOptimizationHelper.openBatteryOptimizationSettings(context)
        }

        Function("openAppSettings") {
            val context = appContext.reactContext ?: return@Function false
            BatteryOptimizationHelper.openAppDetailsSettings(context)
        }

        Function("setOnlyListenWhileCharging") { enabled: Boolean ->
            val context = appContext.reactContext
            if (context != null) {
                val prefs = context.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE)
                prefs.edit().putBoolean("only_listen_while_charging", enabled).apply()
            }
            JarvisListenerService.instance?.setChargingOnlyMode(enabled) ?: run {
                JarvisListenerService.onlyListenWhileCharging = enabled
            }
        }

        Function("getOnlyListenWhileCharging") {
            val context = appContext.reactContext
            if (context != null) {
                val prefs = context.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE)
                prefs.getBoolean("only_listen_while_charging", JarvisListenerService.onlyListenWhileCharging)
            } else {
                JarvisListenerService.onlyListenWhileCharging
            }
        }

        Function("setPreferredLanguage") { lang: String ->
            val validLang = if (lang.isNotBlank()) lang else "en-IN"
            JarvisListenerService.preferredLanguage = validLang
            val context = appContext.reactContext
            if (context != null) {
                val prefs = context.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE)
                prefs.edit().putString("preferred_language", validLang).apply()
            }
        }

        Function("getPreferredLanguage") {
            val context = appContext.reactContext
            if (context != null) {
                val prefs = context.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE)
                prefs.getString("preferred_language", JarvisListenerService.preferredLanguage) ?: "en-IN"
            } else {
                JarvisListenerService.preferredLanguage
            }
        }

        Function("getJarvisServiceState") {
            val s = JarvisListenerService.instance
            if (s != null) {
                s.getCurrentStateName()
            } else {
                "STOPPED"
            }
        }

        Function("setSelectedWakeModel") { modelKey: String ->
            val key = if (modelKey.contains("hello")) "hello_jarvis" else "hey_jarvis"
            JarvisListenerService.selectedWakeModel = key
            val context = appContext.reactContext
            if (context != null) {
                val prefs = context.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE)
                prefs.edit().putString("selected_wake_model", key).apply()
            }
            JarvisListenerService.instance?.updateWakeModel(key)
        }

        Function("getSelectedWakeModel") {
            val context = appContext.reactContext
            if (context != null) {
                val prefs = context.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE)
                prefs.getString("selected_wake_model", JarvisListenerService.selectedWakeModel) ?: "hey_jarvis"
            } else {
                JarvisListenerService.selectedWakeModel
            }
        }

        Function("isAccessibilityServiceEnabled") {
            val context = appContext.reactContext ?: return@Function false
            if (JarvisAccessibilityService.isServiceEnabled) return@Function true
            val enabledServices = android.provider.Settings.Secure.getString(
                context.contentResolver,
                android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: return@Function false
            val colonSplitter = android.text.TextUtils.SimpleStringSplitter(':')
            colonSplitter.setString(enabledServices)
            while (colonSplitter.hasNext()) {
                val componentNameString = colonSplitter.next()
                val enabledComponent = android.content.ComponentName.unflattenFromString(componentNameString)
                if (enabledComponent != null && enabledComponent.packageName == context.packageName && enabledComponent.className.contains("JarvisAccessibilityService")) {
                    return@Function true
                }
            }
            false
        }

        Function("openAccessibilitySettings") {
            val context = appContext.reactContext ?: return@Function
            val intent = Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }

        Function("sendWhatsAppMessage") { contact: String, message: String ->
            val context = appContext.reactContext ?: return@Function false
            val result = com.ritvik.jammusic.jarvis.handlers.WhatsAppHandler.sendWhatsAppMessage(context, contact, message)
            result.success
        }

        Function("getStatusReport") {
            val context = appContext.reactContext ?: return@Function null
            val result = com.ritvik.jammusic.jarvis.handlers.DiagnosticsHandler.generateStatusReport(context)
            mapOf(
                "spokenReply" to result.spokenReply,
                "actionId" to result.actionId,
                "extraData" to (result.extraData ?: emptyMap<String, String>())
            )
        }
    }
}

