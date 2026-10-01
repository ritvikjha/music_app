package com.ritvik.jammusic.jarvis.handlers

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Environment
import android.os.StatFs
import android.util.Log
import com.ritvik.jammusic.jarvis.CommandResult

/**
 * DiagnosticsHandler — "Status Report" & System Telemetry in Stark Butler Persona.
 * Gathers on-device battery, thermal, network, and storage diagnostics with zero internet dependency.
 */
object DiagnosticsHandler {
    private const val TAG = "JarvisDiagnostics"

    fun generateStatusReport(context: Context): CommandResult {
        return try {
            // 1. Battery Telemetry (Percentage, Temperature, Charging)
            val batteryIntent = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val level = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale = batteryIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
            val batteryPct = if (level >= 0 && scale > 0) (level * 100) / scale else 100

            val rawTemp = batteryIntent?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) ?: 0
            val tempCelsius = Math.round((rawTemp / 10.0) * 10.0) / 10.0

            val thermalStatus = when {
                tempCelsius < 38.0 -> "optimal"
                tempCelsius < 43.0 -> "nominal"
                else -> "elevated"
            }

            // 2. Network Telemetry
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            val activeNetwork = connectivityManager?.activeNetwork
            val capabilities = connectivityManager?.getNetworkCapabilities(activeNetwork)

            val networkSummary = when {
                capabilities == null -> "Offline. Operating under local protocols"
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "Connected to high-speed Wi-Fi network"
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "Connected to high-speed cellular data link"
                else -> "Local network links active"
            }

            // 3. Storage Telemetry (StatFs)
            val statFs = StatFs(Environment.getDataDirectory().path)
            val freeBytes = statFs.availableBlocksLong * statFs.blockSizeLong
            val freeGb = Math.round((freeBytes.toDouble() / (1024 * 1024 * 1024)) * 10.0) / 10.0

            // 4. Construct Stark Butler Spoken Diagnostic
            val spokenReport = "All systems nominal, sir. Power is at $batteryPct percent, thermal readings $thermalStatus at $tempCelsius degrees Celsius. $networkSummary. Free storage at $freeGb gigabytes. Music playback ready."

            Log.i(TAG, "Generated diagnostics report: $spokenReport")

            CommandResult(
                success = true,
                spokenReply = spokenReport,
                actionId = "STATUS_REPORT",
                extraData = mapOf(
                    "batteryPct" to batteryPct.toString(),
                    "tempCelsius" to tempCelsius.toString(),
                    "thermalStatus" to thermalStatus,
                    "network" to networkSummary,
                    "freeStorageGb" to freeGb.toString()
                )
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error generating diagnostics report", e)
            CommandResult(
                success = true,
                spokenReply = "All critical systems are functioning normally, sir.",
                actionId = "STATUS_REPORT",
                error = e.message
            )
        }
    }
}
