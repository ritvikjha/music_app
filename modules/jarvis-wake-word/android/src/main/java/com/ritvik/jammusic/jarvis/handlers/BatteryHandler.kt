package com.ritvik.jammusic.jarvis.handlers

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.util.Log
import com.ritvik.jammusic.jarvis.CommandResult

object BatteryHandler {
    private const val TAG = "JarvisBattery"

    fun getBatteryStatus(context: Context): CommandResult {
        return try {
            val batteryStatus: Intent? = IntentFilter(Intent.ACTION_BATTERY_CHANGED).let { filter ->
                context.registerReceiver(null, filter)
            }

            val level: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
            val status: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1

            val batteryPct = if (level != -1 && scale != -1) {
                ((level / scale.toFloat()) * 100).toInt()
            } else {
                val bm = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
                bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 50
            }

            val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                    status == BatteryManager.BATTERY_STATUS_FULL

            val reply = if (isCharging) {
                "Battery is at $batteryPct percent and currently charging."
            } else {
                "Battery is at $batteryPct percent."
            }

            Log.i(TAG, "Battery status queried: $batteryPct% (charging=$isCharging)")

            CommandResult(
                success = true,
                spokenReply = reply,
                actionId = "BATTERY_STATUS",
                extraData = mapOf("level" to batteryPct, "charging" to isCharging)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read battery status", e)
            CommandResult(false, "Could not check battery level.", "BATTERY_STATUS", e.message)
        }
    }
}
