package com.ritvik.jammusic.jarvis.handlers

import android.Manifest
import android.content.ContentUris
import android.content.Context
import android.content.pm.PackageManager
import android.database.Cursor
import android.media.AudioManager
import android.net.Uri
import android.provider.CalendarContract
import android.util.Log
import androidx.core.content.ContextCompat
import com.ritvik.jammusic.jarvis.CommandResult
import java.text.SimpleDateFormat
import java.util.*

/**
 * CalendarHandler — Reads native Android calendar events for morning briefings and Smart DND.
 */
object CalendarHandler {
    private const val TAG = "JarvisCalendar"

    data class CalendarEvent(
        val title: String,
        val startMillis: Long,
        val endMillis: Long,
        val isAllDay: Boolean
    )

    fun getTodayEvents(context: Context): List<CalendarEvent> {
        val hasPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_CALENDAR
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasPermission) {
            Log.w(TAG, "READ_CALENDAR permission not granted")
            return emptyList()
        }

        val events = mutableListOf<CalendarEvent>()
        val calendar = Calendar.getInstance()

        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        val startOfDay = calendar.timeInMillis

        calendar.set(Calendar.HOUR_OF_DAY, 23)
        calendar.set(Calendar.MINUTE, 59)
        calendar.set(Calendar.SECOND, 59)
        calendar.set(Calendar.MILLISECOND, 999)
        val endOfDay = calendar.timeInMillis

        val builder = CalendarContract.Instances.CONTENT_URI.buildUpon()
        ContentUris.appendId(builder, startOfDay)
        ContentUris.appendId(builder, endOfDay)

        val projection = arrayOf(
            CalendarContract.Instances.TITLE,
            CalendarContract.Instances.BEGIN,
            CalendarContract.Instances.END,
            CalendarContract.Instances.ALL_DAY
        )

        var cursor: Cursor? = null
        try {
            cursor = context.contentResolver.query(
                builder.build(),
                projection,
                null,
                null,
                "${CalendarContract.Instances.BEGIN} ASC"
            )

            cursor?.let {
                val titleIdx = it.getColumnIndex(CalendarContract.Instances.TITLE)
                val beginIdx = it.getColumnIndex(CalendarContract.Instances.BEGIN)
                val endIdx = it.getColumnIndex(CalendarContract.Instances.END)
                val allDayIdx = it.getColumnIndex(CalendarContract.Instances.ALL_DAY)

                while (it.moveToNext()) {
                    val title = it.getString(titleIdx) ?: "Untitled Event"
                    val begin = it.getLong(beginIdx)
                    val end = it.getLong(endIdx)
                    val allDay = it.getInt(allDayIdx) == 1
                    events.add(CalendarEvent(title, begin, end, allDay))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error querying calendar instances", e)
        } finally {
            cursor?.close()
        }

        return events
    }

    fun getCalendarBriefing(context: Context): CommandResult {
        val hasPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_CALENDAR
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasPermission) {
            return CommandResult(
                success = false,
                spokenReply = "I need calendar permission to read your schedule, sir. You can enable it in Android Settings.",
                actionId = "CALENDAR_BRIEFING",
                error = "PERMISSION_DENIED"
            )
        }

        val events = getTodayEvents(context)
        if (events.isEmpty()) {
            return CommandResult(
                success = true,
                spokenReply = "You have clear skies on your calendar today, sir. No meetings scheduled.",
                actionId = "CALENDAR_BRIEFING"
            )
        }

        val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
        val count = events.size
        val summaryParts = mutableListOf<String>()

        for (e in events.take(4)) {
            if (e.isAllDay) {
                summaryParts.add("${e.title} (all day)")
            } else {
                val timeStr = timeFormat.format(Date(e.startMillis))
                summaryParts.add("${e.title} at $timeStr")
            }
        }

        val spoken = if (count == 1) {
            "You have one meeting today: ${summaryParts[0]}, sir."
        } else {
            val listText = summaryParts.joinToString(", ")
            "You have $count events today: $listText, sir."
        }

        return CommandResult(
            success = true,
            spokenReply = spoken,
            actionId = "CALENDAR_BRIEFING",
            extraData = mapOf("eventCount" to count.toString())
        )
    }

    /**
     * Smart Do Not Disturb: Detects ongoing meetings and engages silent mode.
     */
    fun checkAndApplySmartDnd(context: Context): CommandResult {
        val now = System.currentTimeMillis()
        val events = getTodayEvents(context)
        val currentEvent = events.firstOrNull { it.startMillis <= now && now <= it.endMillis }

        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

        if (currentEvent != null) {
            try {
                audioManager.ringerMode = AudioManager.RINGER_MODE_VIBRATE
            } catch (e: Exception) {
                Log.w(TAG, "Failed to set ringer mode to vibrate", e)
            }
            return CommandResult(
                success = true,
                spokenReply = "Smart Do Not Disturb active for ${currentEvent.title}, sir. Phone set to vibrate.",
                actionId = "SMART_DND",
                extraData = mapOf("event" to currentEvent.title)
            )
        } else {
            return CommandResult(
                success = true,
                spokenReply = "No active meetings right now, sir. Normal alert protocols maintained.",
                actionId = "SMART_DND"
            )
        }
    }
}
