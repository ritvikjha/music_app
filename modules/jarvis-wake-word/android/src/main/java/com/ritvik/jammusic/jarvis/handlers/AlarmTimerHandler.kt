package com.ritvik.jammusic.jarvis.handlers

import android.content.Context
import android.content.Intent
import android.provider.AlarmClock
import android.util.Log
import com.ritvik.jammusic.jarvis.CommandResult

object AlarmTimerHandler {
    private const val TAG = "JarvisAlarmTimer"

    fun setTimer(context: Context, slots: Map<String, String>): CommandResult {
        val secondsStr = slots["seconds"]
        val minutesStr = slots["minutes"]

        val totalSeconds = when {
            !secondsStr.isNullOrBlank() -> secondsStr.toIntOrNull() ?: 60
            !minutesStr.isNullOrBlank() -> (minutesStr.toFloatOrNull()?.times(60))?.toInt() ?: 300
            else -> 300 // default 5 min
        }

        return try {
            val intent = Intent(AlarmClock.ACTION_SET_TIMER).apply {
                putExtra(AlarmClock.EXTRA_LENGTH, totalSeconds)
                putExtra(AlarmClock.EXTRA_MESSAGE, "Jarvis Timer")
                putExtra(AlarmClock.EXTRA_SKIP_UI, true)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)

            val displayMinutes = totalSeconds / 60
            val displaySecs = totalSeconds % 60
            val durationText = if (displayMinutes > 0 && displaySecs > 0) {
                "$displayMinutes minutes and $displaySecs seconds"
            } else if (displayMinutes > 0) {
                "$displayMinutes minute" + if (displayMinutes > 1) "s" else ""
            } else {
                "$displaySecs seconds"
            }

            val spoken = "Timer set for $durationText."
            Log.i(TAG, "Native timer started for $totalSeconds seconds")

            CommandResult(
                success = true,
                spokenReply = spoken,
                actionId = "SET_TIMER",
                extraData = mapOf("seconds" to totalSeconds)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start timer intent", e)
            CommandResult(
                success = false,
                spokenReply = "Could not set the timer.",
                actionId = "SET_TIMER",
                error = e.message
            )
        }
    }

    fun setAlarm(context: Context, slots: Map<String, String>): CommandResult {
        val rawHour = slots["hour"]?.toIntOrNull() ?: 7
        val rawMinute = slots["minute"]?.toIntOrNull() ?: 0
        val amPm = slots["ampm"]?.lowercase()

        var hour = rawHour
        if (amPm == "pm" && hour < 12) {
            hour += 12
        } else if (amPm == "am" && hour == 12) {
            hour = 0
        }

        return try {
            val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
                putExtra(AlarmClock.EXTRA_HOUR, hour)
                putExtra(AlarmClock.EXTRA_MINUTES, rawMinute)
                putExtra(AlarmClock.EXTRA_MESSAGE, "Jarvis Alarm")
                putExtra(AlarmClock.EXTRA_SKIP_UI, true)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)

            val displayHour12 = if (hour == 0) 12 else if (hour > 12) hour - 12 else hour
            val period = if (hour >= 12) "PM" else "AM"
            val displayTime = String.format("%d:%02d %s", displayHour12, rawMinute, period)

            val spoken = "Alarm set for $displayTime."
            Log.i(TAG, "Native alarm set for $hour:$rawMinute")

            CommandResult(
                success = true,
                spokenReply = spoken,
                actionId = "SET_ALARM",
                extraData = mapOf("hour" to hour, "minute" to rawMinute)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set alarm intent", e)
            CommandResult(
                success = false,
                spokenReply = "Could not set the alarm.",
                actionId = "SET_ALARM",
                error = e.message
            )
        }
    }
}
