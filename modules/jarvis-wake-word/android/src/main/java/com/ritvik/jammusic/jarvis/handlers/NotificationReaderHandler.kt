package com.ritvik.jammusic.jarvis.handlers

import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.service.notification.StatusBarNotification
import android.util.Log
import com.ritvik.jammusic.jarvis.CommandResult

/**
 * NotificationReaderHandler — Reads recent notifications aloud (<50ms).
 *
 * Note: Reading notifications from other apps requires NotificationListenerService
 * permission, which the user must grant manually in Settings > Apps > Special Access.
 * This handler reads system-level notification state as a best-effort approach.
 */
object NotificationReaderHandler {
    private const val TAG = "JarvisNotifications"

    /**
     * Check if there are active (unread) notifications and summarize them.
     * This uses the NotificationManager to check the app's own notifications.
     * For reading ALL notifications, a NotificationListenerService is needed.
     */
    fun readNotifications(context: Context): CommandResult {
        return try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Check pending notification count using the app's active notifications
            val activeNotifications: Array<StatusBarNotification> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                notificationManager.activeNotifications
            } else {
                emptyArray()
            }

            if (activeNotifications.isEmpty()) {
                return CommandResult(
                    success = true,
                    spokenReply = "No pending notifications, sir. All clear.",
                    actionId = "READ_NOTIFICATIONS"
                )
            }

            // Summarize top 3 notifications
            val summaries = activeNotifications.take(3).mapNotNull { sbn ->
                val title = sbn.notification.extras.getString("android.title") ?: ""
                val text = sbn.notification.extras.getString("android.text") ?: ""
                if (title.isNotBlank() || text.isNotBlank()) {
                    "$title: $text".trim().take(80)
                } else null
            }

            val count = activeNotifications.size
            val spoken = if (summaries.isEmpty()) {
                "You have $count notification${if (count > 1) "s" else ""}, but I couldn't read their content."
            } else {
                val joined = summaries.joinToString(". ")
                "You have $count notification${if (count > 1) "s" else ""}. $joined."
            }

            Log.i(TAG, "Read $count notifications, summarized ${summaries.size}")

            CommandResult(
                success = true,
                spokenReply = spoken,
                actionId = "READ_NOTIFICATIONS",
                extraData = mapOf("count" to count)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error reading notifications", e)
            CommandResult(false, "Could not read notifications.", "READ_NOTIFICATIONS", e.message)
        }
    }

    /**
     * Get the count of pending notifications.
     */
    fun getNotificationCount(context: Context): Int {
        return try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                notificationManager.activeNotifications.size
            } else {
                0
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error counting notifications", e)
            0
        }
    }
}
