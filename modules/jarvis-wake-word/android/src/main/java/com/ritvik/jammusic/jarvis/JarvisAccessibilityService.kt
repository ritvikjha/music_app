package com.ritvik.jammusic.jarvis

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.util.Locale

/**
 * JarvisAccessibilityService — 100% Hands-Free WhatsApp Auto-Send.
 *
 * Listens for WhatsApp chat window rendering when a message command has been dispatched.
 * Automatically locates the Send button, clicks it, navigates the user back, and speaks confirmation.
 */
class JarvisAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "JarvisA11y"
        private const val EXPIRATION_WINDOW_MS = 5000L

        @Volatile
        var instance: JarvisAccessibilityService? = null
            private set

        @Volatile
        var isServiceEnabled: Boolean = false
            private set

        @Volatile
        var pendingAutoSend: Boolean = false
            private set

        @Volatile
        var pendingRecipientName: String = ""
            private set

        @Volatile
        private var autoSendExpirationTime: Long = 0L

        /**
         * Trigger an auto-send sequence. Active for up to 5 seconds.
         */
        fun triggerAutoSend(recipientName: String = "") {
            pendingAutoSend = true
            pendingRecipientName = recipientName.trim()
            autoSendExpirationTime = System.currentTimeMillis() + EXPIRATION_WINDOW_MS
            Log.i(TAG, "⚡ WhatsApp auto-send triggered for '$pendingRecipientName' (expires in 5s)")
        }

        /**
         * Cancel pending auto-send
         */
        fun cancelAutoSend() {
            pendingAutoSend = false
            pendingRecipientName = ""
            autoSendExpirationTime = 0L
        }
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var fallbackTts: TextToSpeech? = null
    private var isTtsReady = false

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        isServiceEnabled = true
        Log.i(TAG, "JarvisAccessibilityService connected and enabled")

        // Initialize fallback TextToSpeech in case foreground service isn't active
        try {
            fallbackTts = TextToSpeech(applicationContext) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    fallbackTts?.language = Locale("en", "IN")
                    isTtsReady = true
                    Log.i(TAG, "Fallback TTS initialized in AccessibilityService")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not initialize fallback TTS in AccessibilityService", e)
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        // 1. Verify pending auto-send state
        if (!pendingAutoSend) return

        // 2. Check 5-second expiration
        if (System.currentTimeMillis() > autoSendExpirationTime) {
            Log.w(TAG, "WhatsApp auto-send expired after 5s timeout")
            cancelAutoSend()
            return
        }

        // 3. Verify event is from WhatsApp
        val packageName = event.packageName?.toString() ?: ""
        if (packageName != "com.whatsapp") return

        // 4. Retrieve root window node
        val rootNode = rootInActiveWindow ?: return

        try {
            // 5. Search for WhatsApp send button node
            val sendButton = findWhatsAppSendButton(rootNode)
            if (sendButton != null) {
                Log.i(TAG, "Found WhatsApp send button node ($sendButton) — executing click")

                val clicked = performClick(sendButton)
                if (clicked) {
                    val recipient = pendingRecipientName
                    // Reset pending flag immediately to avoid double clicks
                    cancelAutoSend()

                    Log.i(TAG, "✅ WhatsApp Send button clicked successfully for: '$recipient'")

                    // 6. Return user back to their previous screen / Jam app
                    mainHandler.postDelayed({
                        val backSuccess = performGlobalAction(GLOBAL_ACTION_BACK)
                        if (!backSuccess) {
                            performGlobalAction(GLOBAL_ACTION_HOME)
                        }
                    }, 400)

                    // 7. Vocalize confirmation via TTS: "Message sent to <Contact>, sir."
                    val spokenReply = if (recipient.isNotBlank()) {
                        "Message sent to $recipient, sir."
                    } else {
                        "Message sent, sir."
                    }

                    mainHandler.postDelayed({
                        speakConfirmation(spokenReply)
                    }, 650)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error executing accessibility auto-send", e)
        }
    }

    /**
     * Find WhatsApp send button:
     * 1. Check view ID "com.whatsapp:id/send"
     * 2. Fallback to content description or text "Send" / "भेजें"
     */
    private fun findWhatsAppSendButton(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        // Method A: Exact WhatsApp send view ID
        try {
            val byId = root.findAccessibilityNodeInfosByViewId("com.whatsapp:id/send")
            if (!byId.isNullOrEmpty()) {
                val clickableNode = byId.firstOrNull { it.isClickable || it.isEnabled } ?: byId[0]
                return clickableNode
            }
        } catch (e: Exception) {
            Log.d(TAG, "findAccessibilityNodeInfosByViewId check skipped: ${e.message}")
        }

        // Method B: Content description search ("Send" / "भेजें")
        return searchNodeRecursively(root)
    }

    private fun searchNodeRecursively(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null

        val desc = node.contentDescription?.toString()?.trim()
        val text = node.text?.toString()?.trim()

        if (isSendMatch(desc) || isSendMatch(text)) {
            return node
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            val result = searchNodeRecursively(child)
            if (result != null) return result
        }
        return null
    }

    private fun isSendMatch(content: String?): Boolean {
        if (content.isNullOrBlank()) return false
        val s = content.lowercase().trim()
        return s == "send" || s == "भेजें" || s == "send message" || s == "संदेश भेजें"
    }

    /**
     * Perform click on the node, or climb ancestors if child node itself is not marked clickable.
     */
    private fun performClick(node: AccessibilityNodeInfo): Boolean {
        if (node.isClickable) {
            return node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        }
        var current: AccessibilityNodeInfo? = node.parent
        while (current != null) {
            if (current.isClickable) {
                return current.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            }
            current = current.parent
        }
        // Fallback attempt click on target node directly
        return node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
    }

    private fun speakConfirmation(text: String) {
        // Priority 1: Use running JarvisListenerService TTS
        val serviceInstance = JarvisListenerService.instance
        if (serviceInstance != null) {
            serviceInstance.speak(text)
            return
        }

        // Priority 2: Use fallback TextToSpeech instance
        if (isTtsReady && fallbackTts != null) {
            fallbackTts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "whatsapp_auto_send")
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "JarvisAccessibilityService interrupted")
        cancelAutoSend()
    }

    override fun onDestroy() {
        super.onDestroy()
        isServiceEnabled = false
        instance = null
        cancelAutoSend()
        try {
            fallbackTts?.stop()
            fallbackTts?.shutdown()
            fallbackTts = null
        } catch (e: Exception) {
            Log.w(TAG, "Error shutting down fallback TTS", e)
        }
        Log.i(TAG, "JarvisAccessibilityService destroyed")
    }
}
