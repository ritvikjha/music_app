package com.ritvik.jammusic.jarvis.handlers

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.Intent
import android.net.wifi.WifiManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.ritvik.jammusic.jarvis.CommandResult

/**
 * ConnectivityHandler — Toggles WiFi, Bluetooth, and Airplane Mode natively (<50ms).
 *
 * Notes:
 * - WiFi toggle: Direct API works on Android < 10 (API 29). On Android 10+,
 *   we open the WiFi settings panel since direct toggle is restricted.
 * - Bluetooth toggle: Works via BluetoothAdapter on all versions (requires BLUETOOTH_CONNECT on API 31+).
 * - Airplane mode: Cannot be toggled programmatically since Android 4.2; opens Settings instead.
 */
object ConnectivityHandler {
    private const val TAG = "JarvisConnectivity"

    // ==========================================
    // WiFi
    // ==========================================

    fun setWifi(context: Context, enable: Boolean): CommandResult {
        return try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                // Android 9 and below: direct toggle
                @Suppress("DEPRECATION")
                val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
                @Suppress("DEPRECATION")
                wifiManager.isWifiEnabled = enable
                val label = if (enable) "WiFi enabled" else "WiFi disabled"
                Log.i(TAG, label)
                CommandResult(true, "$label.", if (enable) "WIFI_ON" else "WIFI_OFF")
            } else {
                // Android 10+: open WiFi panel
                val intent = Intent(Settings.Panel.ACTION_WIFI).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                val label = if (enable) "Opening WiFi panel. Please toggle it on." else "Opening WiFi panel. Please toggle it off."
                Log.i(TAG, "Opened WiFi panel (Android 10+ restriction)")
                CommandResult(true, label, if (enable) "WIFI_ON" else "WIFI_OFF")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error toggling WiFi", e)
            CommandResult(false, "Could not toggle WiFi.", "WIFI_TOGGLE", e.message)
        }
    }

    fun toggleWifi(context: Context): CommandResult {
        return try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                @Suppress("DEPRECATION")
                val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
                @Suppress("DEPRECATION")
                val currentState = wifiManager.isWifiEnabled
                return setWifi(context, !currentState)
            } else {
                val intent = Intent(Settings.Panel.ACTION_WIFI).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                CommandResult(true, "Opening WiFi panel.", "WIFI_TOGGLE")
            }
        } catch (e: Exception) {
            CommandResult(false, "Could not toggle WiFi.", "WIFI_TOGGLE", e.message)
        }
    }

    // ==========================================
    // Bluetooth
    // ==========================================

    fun setBluetooth(context: Context, enable: Boolean): CommandResult {
        return try {
            val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            val adapter = bluetoothManager?.adapter ?: BluetoothAdapter.getDefaultAdapter()

            if (adapter == null) {
                return CommandResult(false, "Bluetooth is not available on this device.", "BLUETOOTH_TOGGLE")
            }

            @Suppress("MissingPermission")
            if (enable) {
                if (!adapter.isEnabled) {
                    adapter.enable()
                    Log.i(TAG, "Bluetooth enabling")
                    CommandResult(true, "Bluetooth turning on.", "BLUETOOTH_ON")
                } else {
                    CommandResult(true, "Bluetooth is already on.", "BLUETOOTH_ON")
                }
            } else {
                if (adapter.isEnabled) {
                    adapter.disable()
                    Log.i(TAG, "Bluetooth disabling")
                    CommandResult(true, "Bluetooth turning off.", "BLUETOOTH_OFF")
                } else {
                    CommandResult(true, "Bluetooth is already off.", "BLUETOOTH_OFF")
                }
            }
        } catch (e: SecurityException) {
            Log.w(TAG, "Bluetooth permission denied, opening settings", e)
            try {
                val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                CommandResult(true, "Opening Bluetooth settings.", "BLUETOOTH_TOGGLE")
            } catch (e2: Exception) {
                CommandResult(false, "Could not toggle Bluetooth.", "BLUETOOTH_TOGGLE", e2.message)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error toggling Bluetooth", e)
            CommandResult(false, "Could not toggle Bluetooth.", "BLUETOOTH_TOGGLE", e.message)
        }
    }

    fun toggleBluetooth(context: Context): CommandResult {
        return try {
            val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
            val adapter = bluetoothManager?.adapter ?: BluetoothAdapter.getDefaultAdapter()
            if (adapter == null) {
                return CommandResult(false, "Bluetooth is not available.", "BLUETOOTH_TOGGLE")
            }
            @Suppress("MissingPermission")
            val isOn = adapter.isEnabled
            return setBluetooth(context, !isOn)
        } catch (e: Exception) {
            CommandResult(false, "Could not toggle Bluetooth.", "BLUETOOTH_TOGGLE", e.message)
        }
    }

    // ==========================================
    // Airplane Mode (opens settings — cannot toggle programmatically since Android 4.2)
    // ==========================================

    fun openAirplaneSettings(context: Context): CommandResult {
        return try {
            val intent = Intent(Settings.ACTION_AIRPLANE_MODE_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            Log.i(TAG, "Opened airplane mode settings")
            CommandResult(true, "Opening airplane mode settings.", "AIRPLANE_MODE")
        } catch (e: Exception) {
            CommandResult(false, "Could not open airplane settings.", "AIRPLANE_MODE", e.message)
        }
    }

    // ==========================================
    // Mobile Data (opens settings — cannot toggle directly since Android 5+)
    // ==========================================

    fun openMobileDataSettings(context: Context): CommandResult {
        return try {
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                Intent(Settings.Panel.ACTION_INTERNET_CONNECTIVITY).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            } else {
                Intent(Settings.ACTION_DATA_ROAMING_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            context.startActivity(intent)
            CommandResult(true, "Opening mobile data settings.", "MOBILE_DATA")
        } catch (e: Exception) {
            CommandResult(false, "Could not open data settings.", "MOBILE_DATA", e.message)
        }
    }
}
