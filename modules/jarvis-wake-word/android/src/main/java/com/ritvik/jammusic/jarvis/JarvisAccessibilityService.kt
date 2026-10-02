package com.ritvik.jammusic.jarvis

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Path
import android.graphics.Rect
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.core.app.NotificationCompat
import com.ritvik.jammusic.jarvis.handlers.AppLauncherHandler
import kotlinx.coroutines.*
import java.util.Locale
import kotlin.random.Random

/**
 * JarvisAccessibilityService — Level 6: General App UI Automation & WhatsApp Auto-Send.
 *
 * Provides:
 * 1. open_app(app_name): Package manager lookup & launch
 * 2. scroll(direction, interval, duration): Natural human-like auto-scroll with jitter
 * 3. tap_element(query): Node tree search + click / gesture tap fallback
 * 4. type_text(query, text): Finds editable fields and types text
 * 5. stop_automation(): Voice & notification action cancellation
 * 6. get_foreground_app(): Detects which app is currently active
 * 7. Hands-Free WhatsApp auto-send (legacy Level 5 support)
 */
class JarvisAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "JarvisA11y"
        private const val EXPIRATION_WINDOW_MS = 5000L
        const val ACTION_STOP_AUTOMATION = "com.ritvik.jammusic.jarvis.ACTION_STOP_AUTOMATION"
        private const val CHANNEL_AUTOMATION_ID = "jarvis_automation_channel"
        private const val NOTIFICATION_AUTOMATION_ID = 8821

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

        @Volatile
        var currentForegroundPackage: String = ""
            private set

        @Volatile
        var currentForegroundActivity: String = ""
            private set

        @Volatile
        var isAutoScrolling: Boolean = false
            private set

        @Volatile
        var currentScrollDirection: String = "up"
            private set

        private var autoScrollJob: Job? = null
        private val serviceScope = CoroutineScope(Dispatchers.Default + SupervisorJob())

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

        /**
         * Extracts visible text from the active window.
         * Powers Screen Q&A ("What's on my screen", "Summarize this screen", etc.)
         */
        fun getScreenVisibleText(maxChars: Int = 1000): String {
            val s = instance ?: return ""
            val root = s.rootInActiveWindow ?: return ""
            val textList = mutableListOf<String>()

            fun crawl(node: AccessibilityNodeInfo?) {
                if (node == null || textList.joinToString(" ").length >= maxChars) return
                val t = node.text?.toString()?.trim()
                val d = node.contentDescription?.toString()?.trim()
                if (!t.isNullOrBlank() && t.length > 1 && !textList.contains(t)) {
                    textList.add(t)
                } else if (!d.isNullOrBlank() && d.length > 2 && !textList.contains(d)) {
                    textList.add(d)
                }
                for (i in 0 until node.childCount) {
                    crawl(node.getChild(i))
                }
            }

            crawl(root)
            return textList.joinToString(". ")
        }

        /**
         * Open any app by natural name or package
         */
        fun openApp(context: Context, appName: String): CommandResult {
            return AppLauncherHandler.openApp(context, appName)
        }

        /**
         * Start repeating auto-scroll in foreground app
         */
        fun startAutoScroll(
            direction: String = "up",
            intervalSeconds: Double = 10.0,
            durationSeconds: Int = 0
        ): Boolean {
            val svc = instance
            if (svc == null) {
                Log.w(TAG, "Cannot start auto-scroll: JarvisAccessibilityService is not enabled")
                return false
            }

            stopAutomation()

            isAutoScrolling = true
            currentScrollDirection = direction
            val safeInterval = intervalSeconds.coerceAtLeast(1.5)
            val startTime = System.currentTimeMillis()

            svc.showAutomationNotification(direction, safeInterval)

            autoScrollJob = serviceScope.launch {
                Log.i(TAG, "⚡ Auto-scroll started ($direction, interval=${safeInterval}s, duration=${durationSeconds}s)")
                try {
                    while (isActive && isAutoScrolling) {
                        svc.dispatchScroll(direction)

                        if (durationSeconds > 0) {
                            val elapsed = (System.currentTimeMillis() - startTime) / 1000
                            if (elapsed >= durationSeconds) {
                                Log.i(TAG, "Auto-scroll reached max duration ($durationSeconds s)")
                                break
                            }
                        }

                        // Human-like timing jitter (+/- 12%)
                        val jitterFactor = 1.0 + Random.nextDouble(-0.12, 0.12)
                        val delayMs = (safeInterval * 1000 * jitterFactor).toLong().coerceAtLeast(1200L)
                        delay(delayMs)
                    }
                } catch (e: CancellationException) {
                    Log.i(TAG, "Auto-scroll cancelled")
                } catch (e: Exception) {
                    Log.e(TAG, "Error in auto-scroll loop", e)
                } finally {
                    isAutoScrolling = false
                    svc.dismissAutomationNotification()
                }
            }
            return true
        }

        /**
         * Stop any active automation (auto-scroll, gestures)
         */
        fun stopAutomation(): Boolean {
            val wasRunning = isAutoScrolling || autoScrollJob?.isActive == true
            isAutoScrolling = false
            autoScrollJob?.cancel()
            autoScrollJob = null
            instance?.dismissAutomationNotification()
            if (wasRunning) {
                Log.i(TAG, "🛑 Automation stopped successfully")
            }
            return wasRunning
        }

        /**
         * Tap element by text, description or ID
         */
        fun tapElement(query: String): Boolean {
            val svc = instance ?: return false
            return svc.performTapOnElement(query)
        }

        /**
         * Type text into matching or focused editable field
         */
        fun typeText(query: String, text: String): Boolean {
            val svc = instance ?: return false
            return svc.performTypeText(query, text)
        }

        /**
         * Get active foreground app information
         */
        fun getForegroundAppInfo(context: Context): Map<String, String> {
            val pkg = currentForegroundPackage
            val label = try {
                val pm = context.packageManager
                val appInfo = pm.getApplicationInfo(pkg, 0)
                pm.getApplicationLabel(appInfo).toString()
            } catch (e: Exception) {
                pkg
            }
            return mapOf(
                "packageName" to pkg,
                "appName" to label,
                "activity" to currentForegroundActivity
            )
        }

        /**
         * Inspect visible interactive elements on current screen
         */
        fun inspectScreen(): List<Map<String, Any>> {
            val svc = instance ?: return emptyList()
            val root = svc.rootInActiveWindow ?: return emptyList()
            val list = mutableListOf<Map<String, Any>>()
            svc.collectInteractiveNodes(root, list, maxItems = 60)
            return list
        }
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var fallbackTts: TextToSpeech? = null
    private var isTtsReady = false
    private var stopReceiver: BroadcastReceiver? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        isServiceEnabled = true
        Log.i(TAG, "JarvisAccessibilityService connected and enabled")

        // Register broadcast receiver for STOP action
        try {
            stopReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    if (intent?.action == ACTION_STOP_AUTOMATION) {
                        Log.i(TAG, "ACTION_STOP_AUTOMATION received via broadcast")
                        stopAutomation()
                        speakConfirmation("Automation stopped, sir.")
                    }
                }
            }
            val filter = IntentFilter(ACTION_STOP_AUTOMATION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(stopReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                registerReceiver(stopReceiver, filter)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to register stopReceiver", e)
        }

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

        // Track foreground app
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val pkg = event.packageName?.toString() ?: ""
            if (pkg.isNotBlank() && pkg != "com.android.systemui") {
                currentForegroundPackage = pkg
                currentForegroundActivity = event.className?.toString() ?: ""
            }
        }

        // Handle legacy WhatsApp auto-send if pending
        if (pendingAutoSend) {
            handleWhatsAppAutoSend(event)
        }
    }

    private fun handleWhatsAppAutoSend(event: AccessibilityEvent) {
        if (System.currentTimeMillis() > autoSendExpirationTime) {
            Log.w(TAG, "WhatsApp auto-send expired after 5s timeout")
            cancelAutoSend()
            return
        }

        val packageName = event.packageName?.toString() ?: ""
        if (packageName != "com.whatsapp") return

        val rootNode = rootInActiveWindow ?: return

        try {
            val sendButton = findWhatsAppSendButton(rootNode)
            if (sendButton != null) {
                Log.i(TAG, "Found WhatsApp send button node ($sendButton) — executing click")
                val clicked = performClick(sendButton)
                if (clicked) {
                    val recipient = pendingRecipientName
                    cancelAutoSend()

                    Log.i(TAG, "✅ WhatsApp Send button clicked successfully for: '$recipient'")

                    mainHandler.postDelayed({
                        val backSuccess = performGlobalAction(GLOBAL_ACTION_BACK)
                        if (!backSuccess) {
                            performGlobalAction(GLOBAL_ACTION_HOME)
                        }
                    }, 400)

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

    // ==========================================
    // Gesture & Automation Primitives
    // ==========================================

    /**
     * Dispatch single swipe gesture in specified direction
     */
    fun dispatchScroll(direction: String, durationMs: Long = 300L): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
            return false
        }

        val metrics = resources.displayMetrics
        val width = metrics.widthPixels.toFloat()
        val height = metrics.heightPixels.toFloat()

        val startX: Float
        val startY: Float
        val endX: Float
        val endY: Float

        when (direction.lowercase().trim()) {
            "down" -> {
                // Scroll down (content moves up)
                startX = width * 0.5f
                startY = height * 0.25f
                endX = width * 0.5f + Random.nextInt(-20, 20)
                endY = height * 0.75f
            }
            "left" -> {
                startX = width * 0.82f
                startY = height * 0.5f
                endX = width * 0.18f
                endY = height * 0.5f + Random.nextInt(-20, 20)
            }
            "right" -> {
                startX = width * 0.18f
                startY = height * 0.5f
                endX = width * 0.82f
                endY = height * 0.5f + Random.nextInt(-20, 20)
            }
            else -> {
                // "up" (next reel/short)
                startX = width * 0.5f
                startY = height * 0.78f
                endX = width * 0.5f + Random.nextInt(-20, 20)
                endY = height * 0.22f
            }
        }

        val path = Path().apply {
            moveTo(startX, startY)
            lineTo(endX, endY)
        }

        val stroke = GestureDescription.StrokeDescription(path, 0, durationMs)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()

        var dispatched = false
        val latch = java.util.concurrent.CountDownLatch(1)

        dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                dispatched = true
                latch.countDown()
            }
            override fun onCancelled(gestureDescription: GestureDescription?) {
                dispatched = false
                latch.countDown()
            }
        }, null)

        try {
            latch.await(durationMs + 200L, java.util.concurrent.TimeUnit.MILLISECONDS)
        } catch (e: Exception) {}

        return dispatched
    }

    /**
     * Tap element matching query text, description, or id
     */
    fun performTapOnElement(query: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val q = query.trim().lowercase()
        val node = findNodeByQuery(root, q) ?: return false

        if (performClick(node)) {
            return true
        }

        // Fallback: tap at node screen center via gesture
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val rect = Rect()
            node.getBoundsInScreen(rect)
            if (!rect.isEmpty) {
                val path = Path().apply {
                    moveTo(rect.centerX().toFloat(), rect.centerY().toFloat())
                }
                val stroke = GestureDescription.StrokeDescription(path, 0, 60L)
                val gesture = GestureDescription.Builder().addStroke(stroke).build()
                dispatchGesture(gesture, null, null)
                return true
            }
        }
        return false
    }

    /**
     * Find editable field and set text
     */
    fun performTypeText(query: String, textToType: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val q = query.trim().lowercase()
        val node = findEditableNode(root, q) ?: return false

        node.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
        val args = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, textToType)
        }
        return node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
    }

    private fun findNodeByQuery(node: AccessibilityNodeInfo?, q: String): AccessibilityNodeInfo? {
        if (node == null) return null

        val text = node.text?.toString()?.lowercase() ?: ""
        val desc = node.contentDescription?.toString()?.lowercase() ?: ""
        val viewId = node.viewIdResourceName?.lowercase() ?: ""

        if (text.contains(q) || desc.contains(q) || (q.length > 3 && viewId.contains(q))) {
            return node
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            val match = findNodeByQuery(child, q)
            if (match != null) return match
        }
        return null
    }

    private fun findEditableNode(node: AccessibilityNodeInfo?, q: String): AccessibilityNodeInfo? {
        if (node == null) return null

        val isEditable = node.isEditable || (node.className?.toString()?.contains("EditText", ignoreCase = true) == true)
        if (isEditable) {
            if (q.isBlank() || q == "input" || q == "field" || q == "box" || q == "search") {
                return node
            }
            val text = node.text?.toString()?.lowercase() ?: ""
            val desc = node.contentDescription?.toString()?.lowercase() ?: ""
            val hint = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) node.hintText?.toString()?.lowercase() ?: "" else ""
            if (text.contains(q) || desc.contains(q) || hint.contains(q)) {
                return node
            }
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            val match = findEditableNode(child, q)
            if (match != null) return match
        }
        return null
    }

    private fun collectInteractiveNodes(
        node: AccessibilityNodeInfo?,
        output: MutableList<Map<String, Any>>,
        maxItems: Int
    ) {
        if (node == null || output.size >= maxItems) return

        val text = node.text?.toString()?.trim() ?: ""
        val desc = node.contentDescription?.toString()?.trim() ?: ""
        val isClickable = node.isClickable
        val isEditable = node.isEditable

        if (text.isNotBlank() || desc.isNotBlank() || isClickable || isEditable) {
            val rect = Rect()
            node.getBoundsInScreen(rect)
            output.add(
                mapOf(
                    "text" to text,
                    "desc" to desc,
                    "clickable" to isClickable,
                    "editable" to isEditable,
                    "bounds" to listOf(rect.left, rect.top, rect.right, rect.bottom)
                )
            )
        }

        for (i in 0 until node.childCount) {
            collectInteractiveNodes(node.getChild(i), output, maxItems)
        }
    }

    // ==========================================
    // Notification & Channel Management
    // ==========================================

    private fun createAutomationNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_AUTOMATION_ID,
                "Jarvis App Automation",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Shows active hands-free repeating gestures and quick controls"
                setShowBadge(false)
            }
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    private fun showAutomationNotification(direction: String, interval: Double) {
        createAutomationNotificationChannel()
        val stopIntent = Intent(ACTION_STOP_AUTOMATION).apply {
            setPackage(packageName)
        }
        val stopPendingIntent = PendingIntent.getBroadcast(
            this,
            8821,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_AUTOMATION_ID)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle("Jarvis: Auto-Scrolling ($direction)")
            .setContentText("Swiping every ${interval.toInt()}s • Tap STOP to end")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_media_pause, "STOP", stopPendingIntent)
            .build()

        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIFICATION_AUTOMATION_ID, notification)
    }

    private fun dismissAutomationNotification() {
        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(NOTIFICATION_AUTOMATION_ID)
        } catch (e: Exception) {}
    }

    // ==========================================
    // WhatsApp Support & Helper Methods
    // ==========================================

    private fun findWhatsAppSendButton(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        try {
            val byId = root.findAccessibilityNodeInfosByViewId("com.whatsapp:id/send")
            if (!byId.isNullOrEmpty()) {
                return byId.firstOrNull { it.isClickable || it.isEnabled } ?: byId[0]
            }
        } catch (e: Exception) {
            Log.d(TAG, "findAccessibilityNodeInfosByViewId check skipped: ${e.message}")
        }
        return searchNodeRecursively(root)
    }

    private fun searchNodeRecursively(node: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (node == null) return null
        val desc = node.contentDescription?.toString()?.trim()
        val text = node.text?.toString()?.trim()

        if (isSendMatch(desc) || isSendMatch(text)) return node

        for (i in 0 until node.childCount) {
            val result = searchNodeRecursively(node.getChild(i))
            if (result != null) return result
        }
        return null
    }

    private fun isSendMatch(content: String?): Boolean {
        if (content.isNullOrBlank()) return false
        val s = content.lowercase().trim()
        return s == "send" || s == "भेजें" || s == "send message" || s == "संदेश भेजें"
    }

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
        return node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
    }

    private fun speakConfirmation(text: String) {
        val serviceInstance = JarvisListenerService.instance
        if (serviceInstance != null) {
            serviceInstance.speak(text)
            return
        }

        if (isTtsReady && fallbackTts != null) {
            fallbackTts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "jarvis_a11y_tts")
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "JarvisAccessibilityService interrupted")
        stopAutomation()
        cancelAutoSend()
    }

    override fun onDestroy() {
        super.onDestroy()
        isServiceEnabled = false
        instance = null
        stopAutomation()
        cancelAutoSend()

        stopReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (e: Exception) {}
            stopReceiver = null
        }

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
