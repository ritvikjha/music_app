package com.ritvik.jammusic.jarvis

import android.annotation.SuppressLint
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log

/**
 * Utility to manage Android battery optimizations, Doze mode exemptions,
 * and OEM-specific background task-killer autostart settings.
 */
object BatteryOptimizationHelper {

    private const val TAG = "JarvisBattery"

    /**
     * Returns true if the app IS battery-optimized (i.e. NOT whitelisted).
     * When true, background listening is subject to aggressive OS sleep/killing.
     */
    fun isBatteryOptimized(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return false
        }

        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return false
        val isIgnoring = powerManager.isIgnoringBatteryOptimizations(context.packageName)

        Log.i(TAG, "Battery optimization status: isIgnoringOptimizations=$isIgnoring (${if (isIgnoring) "Unrestricted" else "Restricted"})")
        return !isIgnoring
    }

    /**
     * Requests battery optimization exemption dialog directly (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).
     *
     * PLAY STORE POLICY NOTE:
     * Google Play restricts programmatic prompts for ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
     * to approved use-cases (VoIP, IoT companion, or hands-free voice assistant).
     * For full compliance, always provide user-facing rationale and a fallback to standard Settings.
     */
    @SuppressLint("BatteryLife")
    fun requestIgnoreBatteryOptimizations(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true

        return try {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            Log.i(TAG, "Launched ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS dialog")
            true
        } catch (e: Exception) {
            Log.w(TAG, "Direct request failed; falling back to battery settings list", e)
            openBatteryOptimizationSettings(context)
        }
    }

    /**
     * Opens general battery optimization settings list.
     */
    fun openBatteryOptimizationSettings(context: Context): Boolean {
        return try {
            val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            Log.w(TAG, "Failed to open ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS; opening App Details", e)
            openAppDetailsSettings(context)
        }
    }

    /**
     * Fallback: opens the standard Android App Details Settings page.
     */
    fun openAppDetailsSettings(context: Context): Boolean {
        return try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", context.packageName, null)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open App Details settings", e)
            false
        }
    }

    /**
     * Launches OEM-specific Autostart or Background Management screen.
     * Tries known OEM components; falls back to App Details Settings.
     */
    fun openOemAutostartSettings(context: Context): Boolean {
        val manufacturer = Build.MANUFACTURER.lowercase()
        Log.i(TAG, "Attempting OEM autostart launch for manufacturer: '$manufacturer'")

        val oemIntents = when {
            manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco") -> listOf(
                Intent().setComponent(ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")),
                Intent().setComponent(ComponentName("com.miui.securitycenter", "com.miui.powercenter.PowerSettings")),
                Intent("miui.intent.action.OP_AUTO_START").addCategory(Intent.CATEGORY_DEFAULT)
            )

            manufacturer.contains("oppo") -> listOf(
                Intent().setComponent(ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")),
                Intent().setComponent(ComponentName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity")),
                Intent().setComponent(ComponentName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"))
            )

            manufacturer.contains("realme") -> listOf(
                Intent().setComponent(ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")),
                Intent().setComponent(ComponentName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"))
            )

            manufacturer.contains("vivo") || manufacturer.contains("iqoo") -> listOf(
                Intent().setComponent(ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity")),
                Intent().setComponent(ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")),
                Intent().setComponent(ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager"))
            )

            manufacturer.contains("oneplus") -> listOf(
                Intent().setComponent(ComponentName("com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity")),
                Intent().setComponent(ComponentName("com.oneplus.battery", "com.oneplus.battery.BatteryActivity"))
            )

            manufacturer.contains("samsung") -> listOf(
                Intent().setComponent(ComponentName("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity")),
                Intent().setComponent(ComponentName("com.samsung.android.sm", "com.samsung.android.sm.ui.battery.BatteryActivity")),
                Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
            )

            manufacturer.contains("huawei") || manufacturer.contains("honor") -> listOf(
                Intent().setComponent(ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity")),
                Intent().setComponent(ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.bootstart.BootStartActivity"))
            )

            else -> emptyList()
        }

        for (intent in oemIntents) {
            try {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                Log.i(TAG, "Successfully launched OEM intent: $intent")
                return true
            } catch (e: Exception) {
                Log.d(TAG, "OEM intent not found on this device: $intent")
            }
        }

        // Graceful fallback: App Details Settings screen
        Log.i(TAG, "No OEM intent succeeded; opening standard App Details Settings")
        return openAppDetailsSettings(context)
    }
}
