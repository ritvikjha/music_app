package com.ritvik.jammusic.jarvis.handlers

import android.content.Context
import android.util.Log
import com.ritvik.jammusic.jarvis.CommandResult
import com.ritvik.jammusic.jarvis.JarvisListenerService

/**
 * StarkProtocolsHandler — Macro Automation Protocols (Night, House Party, Stealth).
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
}
