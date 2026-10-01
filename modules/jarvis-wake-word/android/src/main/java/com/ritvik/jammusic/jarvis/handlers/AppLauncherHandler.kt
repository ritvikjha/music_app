package com.ritvik.jammusic.jarvis.handlers

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.MediaStore
import android.provider.Settings
import android.util.Log
import com.ritvik.jammusic.jarvis.CommandResult

object AppLauncherHandler {
    private const val TAG = "JarvisAppLauncher"

    // High-frequency app alias mapping for instant (<5ms) resolution
    private val KNOWN_APP_PACKAGES = mapOf(
        "instagram" to "com.instagram.android",
        "insta" to "com.instagram.android",
        "whatsapp" to "com.whatsapp",
        "youtube" to "com.google.android.youtube",
        "yt" to "com.google.android.youtube",
        "spotify" to "com.spotify.music",
        "chrome" to "com.android.chrome",
        "browser" to "com.android.chrome",
        "twitter" to "com.twitter.android",
        "x" to "com.twitter.android",
        "telegram" to "org.telegram.messenger",
        "snapchat" to "com.snapchat.android",
        "netflix" to "com.netflix.mediaclient",
        "calculator" to "com.google.android.calculator",
        "maps" to "com.google.android.apps.maps",
        "google maps" to "com.google.android.apps.maps",
        "gmail" to "com.google.android.gm",
        "email" to "com.google.android.gm",
        "photos" to "com.google.android.apps.photos",
        "gallery" to "com.google.android.apps.photos",
        "uber" to "com.ubercab",
        "zomato" to "com.application.zomato",
        "swiggy" to "in.swiggy.android",
        "paytm" to "net.one97.paytm",
        "gpay" to "com.google.android.apps.nbu.paisa.user",
        "google pay" to "com.google.android.apps.nbu.paisa.user",
        "phonepe" to "com.phonepe.app",
        "linkedin" to "com.linkedin.android",
        "reddit" to "com.reddit.frontpage",
        "play store" to "com.android.vending",
        "clock" to "com.google.android.deskclock",
        "calendar" to "com.google.android.calendar",
        "notes" to "com.google.android.keep"
    )

    fun openApp(context: Context, rawTarget: String): CommandResult {
        val target = rawTarget.trim().lowercase()
        if (target.isBlank()) {
            return CommandResult(
                success = false,
                spokenReply = "Which app would you like to open?",
                actionId = "OPEN_APP",
                error = "EMPTY_TARGET"
            )
        }

        // Special system handlers
        when (target) {
            "camera" -> {
                return try {
                    val intent = Intent(MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
                    CommandResult(true, "Opening Camera.", "OPEN_APP")
                } catch (e: Exception) {
                    CommandResult(false, "Could not launch camera.", "OPEN_APP", e.message)
                }
            }
            "settings" -> {
                return try {
                    val intent = Intent(Settings.ACTION_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
                    CommandResult(true, "Opening Settings.", "OPEN_APP")
                } catch (e: Exception) {
                    CommandResult(false, "Could not open settings.", "OPEN_APP", e.message)
                }
            }
            "dialer", "phone" -> {
                return try {
                    val intent = Intent(Intent.ACTION_DIAL).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
                    CommandResult(true, "Opening Phone.", "OPEN_APP")
                } catch (e: Exception) {
                    CommandResult(false, "Could not open dialer.", "OPEN_APP", e.message)
                }
            }
        }

        val pm = context.packageManager

        // 1. Check known packages first
        val knownPackage = KNOWN_APP_PACKAGES[target]
        if (knownPackage != null) {
            val intent = pm.getLaunchIntentForPackage(knownPackage)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
                context.startActivity(intent)
                val appLabel = target.replaceFirstChar { it.uppercase() }
                Log.i(TAG, "Launched $appLabel ($knownPackage)")
                return CommandResult(
                    success = true,
                    spokenReply = "Opening $appLabel.",
                    actionId = "OPEN_APP",
                    extraData = mapOf("packageName" to knownPackage)
                )
            }
        }

        // 2. Dynamic lookup across all installed applications
        try {
            val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val resolvedApps = pm.queryIntentActivities(mainIntent, 0)

            for (resolveInfo in resolvedApps) {
                val label = resolveInfo.loadLabel(pm).toString().lowercase()
                if (label == target || label.contains(target) || target.contains(label)) {
                    val packageName = resolveInfo.activityInfo.packageName
                    val launchIntent = pm.getLaunchIntentForPackage(packageName)
                    if (launchIntent != null) {
                        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
                        context.startActivity(launchIntent)
                        val displayLabel = resolveInfo.loadLabel(pm).toString()
                        Log.i(TAG, "Dynamic match: Launched $displayLabel ($packageName)")
                        return CommandResult(
                            success = true,
                            spokenReply = "Opening $displayLabel.",
                            actionId = "OPEN_APP",
                            extraData = mapOf("packageName" to packageName)
                        )
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Dynamic app resolution error", e)
        }

        return CommandResult(
            success = false,
            spokenReply = "Sorry, I couldn't find $rawTarget installed on your phone.",
            actionId = "OPEN_APP",
            error = "APP_NOT_FOUND"
        )
    }
}
