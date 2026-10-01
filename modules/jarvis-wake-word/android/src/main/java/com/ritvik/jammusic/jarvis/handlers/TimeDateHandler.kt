package com.ritvik.jammusic.jarvis.handlers

import android.content.Context
import android.util.Log
import com.ritvik.jammusic.jarvis.CommandResult
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

/**
 * TimeDateHandler — Speaks current time, date, and day of week (<50ms, zero network).
 */
object TimeDateHandler {
    private const val TAG = "JarvisTimeDate"

    fun getCurrentTime(context: Context): CommandResult {
        return try {
            val calendar = Calendar.getInstance()
            val hour = calendar.get(Calendar.HOUR)
            val minute = calendar.get(Calendar.MINUTE)
            val amPm = if (calendar.get(Calendar.AM_PM) == Calendar.AM) "AM" else "PM"
            val displayHour = if (hour == 0) 12 else hour

            val timeStr = if (minute == 0) {
                "$displayHour $amPm"
            } else {
                "$displayHour:${String.format("%02d", minute)} $amPm"
            }

            Log.i(TAG, "Current time: $timeStr")

            CommandResult(
                success = true,
                spokenReply = "It's $timeStr, sir.",
                actionId = "GET_TIME",
                extraData = mapOf("time" to timeStr)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error getting time", e)
            CommandResult(false, "Could not determine the time.", "GET_TIME", e.message)
        }
    }

    fun getCurrentDate(context: Context): CommandResult {
        return try {
            val calendar = Calendar.getInstance()
            val dateFormat = SimpleDateFormat("EEEE, MMMM d, yyyy", Locale.ENGLISH)
            val dateStr = dateFormat.format(calendar.time)

            Log.i(TAG, "Current date: $dateStr")

            CommandResult(
                success = true,
                spokenReply = "Today is $dateStr.",
                actionId = "GET_DATE",
                extraData = mapOf("date" to dateStr)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error getting date", e)
            CommandResult(false, "Could not determine the date.", "GET_DATE", e.message)
        }
    }

    fun getDayOfWeek(context: Context): CommandResult {
        return try {
            val calendar = Calendar.getInstance()
            val dayFormat = SimpleDateFormat("EEEE", Locale.ENGLISH)
            val dayStr = dayFormat.format(calendar.time)

            CommandResult(
                success = true,
                spokenReply = "Today is $dayStr.",
                actionId = "GET_DAY",
                extraData = mapOf("day" to dayStr)
            )
        } catch (e: Exception) {
            CommandResult(false, "Could not determine the day.", "GET_DAY", e.message)
        }
    }

    fun getFullDateTime(context: Context): CommandResult {
        return try {
            val calendar = Calendar.getInstance()
            val dateFormat = SimpleDateFormat("EEEE, MMMM d", Locale.ENGLISH)
            val dateStr = dateFormat.format(calendar.time)

            val hour = calendar.get(Calendar.HOUR)
            val minute = calendar.get(Calendar.MINUTE)
            val amPm = if (calendar.get(Calendar.AM_PM) == Calendar.AM) "AM" else "PM"
            val displayHour = if (hour == 0) 12 else hour
            val timeStr = if (minute == 0) {
                "$displayHour $amPm"
            } else {
                "$displayHour:${String.format("%02d", minute)} $amPm"
            }

            CommandResult(
                success = true,
                spokenReply = "It's $timeStr on $dateStr.",
                actionId = "GET_DATETIME",
                extraData = mapOf("time" to timeStr, "date" to dateStr)
            )
        } catch (e: Exception) {
            CommandResult(false, "Could not determine the time and date.", "GET_DATETIME", e.message)
        }
    }
}
