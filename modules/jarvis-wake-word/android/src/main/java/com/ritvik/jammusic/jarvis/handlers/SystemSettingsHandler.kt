package com.ritvik.jammusic.jarvis.handlers

import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.provider.Settings
import android.util.Log
import com.ritvik.jammusic.jarvis.CommandResult

object SystemSettingsHandler {
    private const val TAG = "JarvisSystemSettings"

    fun setVolume(context: Context, percent: Int): CommandResult {
        return try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val clamped = percent.coerceIn(0, 100)
            val targetVolume = (clamped * maxVolume) / 100

            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, targetVolume, AudioManager.FLAG_SHOW_UI)
            Log.i(TAG, "Native volume set to $clamped% (step $targetVolume of $maxVolume)")

            CommandResult(
                success = true,
                spokenReply = "Volume set to $clamped percent.",
                actionId = "VOLUME_SET",
                extraData = mapOf("percent" to clamped)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error setting system volume", e)
            CommandResult(false, "Could not adjust volume.", "VOLUME_SET", e.message)
        }
    }

    fun adjustVolume(context: Context, direction: Int): CommandResult {
        return try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val flag = if (direction > 0) AudioManager.ADJUST_RAISE else AudioManager.ADJUST_LOWER
            audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, flag, AudioManager.FLAG_SHOW_UI)

            val current = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
            val max = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val currentPercent = if (max > 0) (current * 100) / max else 50

            val actionName = if (direction > 0) "Volume increased." else "Volume decreased."
            Log.i(TAG, "Native volume adjusted: now at $currentPercent%")

            CommandResult(
                success = true,
                spokenReply = actionName,
                actionId = if (direction > 0) "VOLUME_UP" else "VOLUME_DOWN",
                extraData = mapOf("percent" to currentPercent)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error adjusting system volume", e)
            CommandResult(false, "Could not adjust volume.", "VOLUME_ADJUST", e.message)
        }
    }

    fun muteVolume(context: Context): CommandResult {
        return try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, 0, AudioManager.FLAG_SHOW_UI)
            CommandResult(true, "Muted.", "VOLUME_MUTE", extraData = mapOf("percent" to 0))
        } catch (e: Exception) {
            CommandResult(false, "Could not mute volume.", "VOLUME_MUTE", e.message)
        }
    }

    fun openSettings(context: Context, settingType: String): CommandResult {
        val (action, label) = when (settingType.lowercase()) {
            "bluetooth" -> Pair(Settings.ACTION_BLUETOOTH_SETTINGS, "Bluetooth settings")
            "wifi" -> Pair(Settings.ACTION_WIFI_SETTINGS, "Wi-Fi settings")
            "display" -> Pair(Settings.ACTION_DISPLAY_SETTINGS, "Display settings")
            "sound" -> Pair(Settings.ACTION_SOUND_SETTINGS, "Sound settings")
            else -> Pair(Settings.ACTION_SETTINGS, "Settings")
        }

        return try {
            val intent = Intent(action).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            CommandResult(true, "Opening $label.", "OPEN_SETTINGS")
        } catch (e: Exception) {
            CommandResult(false, "Could not open $label.", "OPEN_SETTINGS", e.message)
        }
    }
}
