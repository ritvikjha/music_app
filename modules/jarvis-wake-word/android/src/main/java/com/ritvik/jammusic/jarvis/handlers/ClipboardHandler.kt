package com.ritvik.jammusic.jarvis.handlers

import android.content.ClipboardManager
import android.content.Context
import android.util.Log
import com.ritvik.jammusic.jarvis.CommandResult

/**
 * ClipboardHandler — Reads clipboard text aloud (<50ms).
 */
object ClipboardHandler {
    private const val TAG = "JarvisClipboard"

    fun readClipboard(context: Context): CommandResult {
        return try {
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager

            if (!clipboard.hasPrimaryClip()) {
                return CommandResult(
                    success = true,
                    spokenReply = "Your clipboard is empty, sir.",
                    actionId = "CLIPBOARD_READ"
                )
            }

            val clip = clipboard.primaryClip
            val text = clip?.getItemAt(0)?.text?.toString()?.trim()

            if (text.isNullOrBlank()) {
                return CommandResult(
                    success = true,
                    spokenReply = "Your clipboard is empty.",
                    actionId = "CLIPBOARD_READ"
                )
            }

            // Truncate for TTS to avoid reading absurdly long content
            val truncated = if (text.length > 200) {
                text.take(200) + "... and more"
            } else {
                text
            }

            Log.i(TAG, "Clipboard read: ${truncated.take(50)}...")

            CommandResult(
                success = true,
                spokenReply = "Your clipboard says: $truncated",
                actionId = "CLIPBOARD_READ",
                extraData = mapOf("text" to text)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error reading clipboard", e)
            CommandResult(false, "Could not read clipboard.", "CLIPBOARD_READ", e.message)
        }
    }
}
