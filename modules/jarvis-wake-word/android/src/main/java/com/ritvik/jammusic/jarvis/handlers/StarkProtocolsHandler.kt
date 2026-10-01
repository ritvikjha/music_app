package com.ritvik.jammusic.jarvis.handlers

import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.util.Log
import com.ritvik.jammusic.jarvis.CommandResult
import com.ritvik.jammusic.jarvis.JarvisListenerService

/**
 * StarkProtocolsHandler — Macro Automation Protocols.
 * Night, House Party, Stealth, Morning, Drive, Focus.
 */
object StarkProtocolsHandler {
    private const val TAG = "JarvisProtocols"

    fun executeProtocolNight(context: Context): CommandResult {
        Log.i(TAG, "Executing Night Protocol")
        // 1. Turn off flashlight
        FlashlightHandler.setFlashlight(context, false)
        // 2. Set volume to quiet 10%
        SystemSettingsHandler.setVolume(context, 10)

        return CommandResult(
            success = true,
            spokenReply = "Rest well, sir. Monitoring systems in background.",
            actionId = "PROTOCOL_NIGHT"
        )
    }

    fun executeProtocolParty(context: Context): CommandResult {
        Log.i(TAG, "Executing House Party Protocol")
        // 1. Turn volume to 85%
        SystemSettingsHandler.setVolume(context, 85)
        // 2. Turn on torch
        FlashlightHandler.setFlashlight(context, true)

        return CommandResult(
            success = true,
            spokenReply = "Party protocol engaged. Turning up the decibels.",
            actionId = "PROTOCOL_PARTY"
        )
    }

    fun executeProtocolStealth(context: Context): CommandResult {
        Log.i(TAG, "Executing Stealth Mode Protocol")
        // 1. Mute all volume
        SystemSettingsHandler.muteVolume(context)
        // 2. Set TTS replies to silent / beep-only mode
        JarvisListenerService.instance?.setTtsSettings(voiceRepliesEnabled = false, beepOnly = true)

        return CommandResult(
            success = true,
            spokenReply = "Stealth mode engaged. Audio muted.",
            actionId = "PROTOCOL_STEALTH"
        )
    }

    fun executeProtocolMorning(context: Context): CommandResult {
        Log.i(TAG, "Executing Morning Protocol")
        // 1. Brightness to 80%
        BrightnessHandler.setBrightness(context, 80)
        // 2. Volume to 50%
        SystemSettingsHandler.setVolume(context, 50)
        // 3. Get time
        val timeResult = TimeDateHandler.getCurrentTime(context)
        val timeStr = timeResult.extraData["time"] ?: "now"
        // 4. Get battery
        val batteryResult = BatteryHandler.getBatteryStatus(context)
        val batteryPct = batteryResult.extraData["level"] ?: "unknown"
        // 5. Notification count
        val notifCount = NotificationReaderHandler.getNotificationCount(context)

        val notifSummary = when {
            notifCount == 0 -> "No pending notifications."
            notifCount == 1 -> "You have 1 notification."
            else -> "You have $notifCount notifications."
        }

        return CommandResult(
            success = true,
            spokenReply = "Good morning, sir. It's $timeStr. Battery at $batteryPct percent. $notifSummary Ready when you are.",
            actionId = "PROTOCOL_MORNING",
            extraData = mapOf("time" to timeStr, "battery" to batteryPct.toString(), "notifications" to notifCount)
        )
    }

    fun executeProtocolDrive(context: Context): CommandResult {
        Log.i(TAG, "Executing Drive Protocol")
        // 1. Volume to 70%
        SystemSettingsHandler.setVolume(context, 70)
        // 2. Try to enable Bluetooth for car connection
        ConnectivityHandler.setBluetooth(context, true)
        // 3. Brightness to 100% for visibility
        BrightnessHandler.setBrightness(context, 100)

        return CommandResult(
            success = true,
            spokenReply = "Drive protocol engaged. Volume at 70, Bluetooth on, screen at full brightness. Drive safe, sir.",
            actionId = "PROTOCOL_DRIVE"
        )
    }

    fun executeProtocolFocus(context: Context): CommandResult {
        Log.i(TAG, "Executing Focus Protocol")
        // 1. Mute volume
        SystemSettingsHandler.muteVolume(context)
        // 2. Dim brightness to 40%
        BrightnessHandler.setBrightness(context, 40)
        // 3. Set TTS to beep-only to minimize interruptions
        JarvisListenerService.instance?.setTtsSettings(voiceRepliesEnabled = false, beepOnly = true)

        return CommandResult(
            success = true,
            spokenReply = "Focus mode activated. Volume muted, screen dimmed. I'll keep interruptions to a minimum.",
            actionId = "PROTOCOL_FOCUS"
        )
    }
}

