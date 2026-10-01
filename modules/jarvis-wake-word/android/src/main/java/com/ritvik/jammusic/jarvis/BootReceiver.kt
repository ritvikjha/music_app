package com.ritvik.jammusic.jarvis

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * BootReceiver — Handles device reboot for the Jarvis Voice Assistant.
 *
 * ANDROID 14 & 15 FOREGROUND SERVICE RULES:
 * - Starting in Android 14 (API 34) and strictly enforced in Android 15 (API 35),
 *   broadcast receivers executing in the background are prohibited from directly
 *   launching foreground services with type "microphone" (FOREGROUND_SERVICE_MICROPHONE).
 * - Attempting to call Context.startForegroundService() directly from BOOT_COMPLETED
 *   throws a fatal ForegroundServiceStartNotAllowedException / SecurityException on Android 15.
 *
 * SOLUTION:
 * - On device boot, we check if Jarvis was previously enabled.
 * - If enabled, rather than attempting an illegal background FGS start, we post a high-priority
 *   interactive notification: "Tap to re-enable Jarvis background listening".
 * - Tapping this notification launches the application via PendingIntent (foreground user interaction),
 *   which safely and cleanly starts the microphone foreground service without OS restrictions.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "JarvisBootReceiver"
        const val BOOT_CHANNEL_ID = "jarvis_boot_channel"
        const val BOOT_NOTIFICATION_ID = 9005
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != "android.intent.action.QUICKBOOT_POWERON" &&
            action != "com.htc.intent.action.QUICKBOOT_POWERON"
        ) {
            return
        }

        Log.i(TAG, "Device reboot completed ($action)")

        // Check if Jarvis was enabled prior to restart
        val prefs = context.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE)
        val wasEnabled = prefs.getBoolean("jarvis_enabled", false)

        if (!wasEnabled) {
            Log.i(TAG, "Jarvis was not enabled prior to restart — no action needed")
            return
        }

        // Post high-priority notification to comply with Android 14/15 FGS background restrictions
        Log.i(TAG, "Posting 'Tap to re-enable Jarvis' notification in compliance with Android 14/15 rules")
        postRebootNotification(context)
    }

    private fun postRebootNotification(context: Context) {
        val notificationManager = context.getSystemService(NotificationManager::class.java) ?: return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                BOOT_CHANNEL_ID,
                "Jarvis Auto-Resume",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Prompts user to re-enable Jarvis background listening after restart"
                setShowBadge(true)
            }
            notificationManager.createNotificationChannel(channel)
        }

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("auto_start_jarvis", true)
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, BOOT_CHANNEL_ID)
            .setContentTitle("Jarvis Voice Assistant")
            .setContentText("Tap to re-enable Jarvis background listening")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(BOOT_NOTIFICATION_ID, notification)
    }
}
