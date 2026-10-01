package com.ritvik.jammusic.jarvis.handlers

import android.content.Context
import android.provider.Settings
import android.util.Log
import com.ritvik.jammusic.jarvis.CommandResult

/**
 * BrightnessHandler — Controls screen brightness natively (<50ms).
 * Supports set-to-percent, increase, decrease, and auto-brightness toggle.
 */
object BrightnessHandler {
    private const val TAG = "JarvisBrightness"

    fun setBrightness(context: Context, percent: Int): CommandResult {
        return try {
            val clamped = percent.coerceIn(0, 100)
            val brightnessValue = (clamped * 255) / 100

            // Disable auto-brightness first so manual value takes effect
            Settings.System.putInt(
                context.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS_MODE,
                Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL
            )
            Settings.System.putInt(
                context.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS,
                brightnessValue
            )
            Log.i(TAG, "Brightness set to $clamped% (raw: $brightnessValue/255)")

            CommandResult(
                success = true,
                spokenReply = "Brightness set to $clamped percent.",
                actionId = "BRIGHTNESS_SET",
                extraData = mapOf("percent" to clamped)
            )
        } catch (e: SecurityException) {
            Log.e(TAG, "Cannot modify system settings — WRITE_SETTINGS permission required", e)
            CommandResult(
                success = false,
                spokenReply = "I need permission to change brightness. Please grant 'Modify System Settings' in your phone settings.",
                actionId = "BRIGHTNESS_SET",
                error = e.message
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error setting brightness", e)
            CommandResult(false, "Could not adjust brightness.", "BRIGHTNESS_SET", e.message)
        }
    }

    fun adjustBrightness(context: Context, direction: Int): CommandResult {
        return try {
            // Disable auto-brightness
            Settings.System.putInt(
                context.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS_MODE,
                Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL
            )

            val current = Settings.System.getInt(
                context.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS,
                128
            )
            val step = 38 // ~15% of 255
            val newValue = if (direction > 0) {
                (current + step).coerceAtMost(255)
            } else {
                (current - step).coerceAtLeast(5) // Never go to absolute zero
            }
            Settings.System.putInt(
                context.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS,
                newValue
            )

            val newPercent = (newValue * 100) / 255
            val actionLabel = if (direction > 0) "Brightness increased" else "Brightness decreased"
            Log.i(TAG, "$actionLabel to $newPercent%")

            CommandResult(
                success = true,
                spokenReply = "$actionLabel.",
                actionId = if (direction > 0) "BRIGHTNESS_UP" else "BRIGHTNESS_DOWN",
                extraData = mapOf("percent" to newPercent)
            )
        } catch (e: SecurityException) {
            CommandResult(
                success = false,
                spokenReply = "I need permission to change brightness.",
                actionId = "BRIGHTNESS_ADJUST",
                error = e.message
            )
        } catch (e: Exception) {
            CommandResult(false, "Could not adjust brightness.", "BRIGHTNESS_ADJUST", e.message)
        }
    }

    fun setAutoBrightness(context: Context, enable: Boolean): CommandResult {
        return try {
            val mode = if (enable) {
                Settings.System.SCREEN_BRIGHTNESS_MODE_AUTOMATIC
            } else {
                Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL
            }
            Settings.System.putInt(
                context.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS_MODE,
                mode
            )
            val label = if (enable) "Auto-brightness enabled" else "Auto-brightness disabled"
            Log.i(TAG, label)

            CommandResult(
                success = true,
                spokenReply = "$label.",
                actionId = "BRIGHTNESS_AUTO",
                extraData = mapOf("auto" to enable)
            )
        } catch (e: SecurityException) {
            CommandResult(
                success = false,
                spokenReply = "I need permission to change brightness settings.",
                actionId = "BRIGHTNESS_AUTO",
                error = e.message
            )
        } catch (e: Exception) {
            CommandResult(false, "Could not toggle auto-brightness.", "BRIGHTNESS_AUTO", e.message)
        }
    }
}
