package com.ritvik.jammusic.jarvis

import android.content.Context
import android.util.Log
import com.ritvik.jammusic.jarvis.handlers.*

/**
 * CommandRegistry — Extensible Native Kotlin Command Registry (<50ms Fast Path).
 * Executes device controls (Apps, Flashlight, Calls, Alarms, Timers, Volume, Battery)
 * with zero JavaScript dependency.
 */
object CommandRegistry {
    private const val TAG = "JarvisRegistry"

    private val COMMANDS = mutableListOf<CommandDefinition>()

    init {
        registerAllCommands()
    }

    private fun registerAllCommands() {
        // ==========================================
        // 1. FLASHLIGHT
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "FLASHLIGHT_ON",
                patterns = listOf(
                    Regex("""^(?:turn\s+on\s+(?:the\s+)?)?flashlight\s*(?:on)?$"""),
                    Regex("""^(?:turn\s+on\s+(?:the\s+)?)?torch\s*(?:on)?$"""),
                    Regex("""^(?:torch|flashlight|light)\s*(?:jalao|chalao|on\s*karo|jala\s*do)$"""),
                    Regex("""^(?:light|torch)\s+on$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> FlashlightHandler.setFlashlight(context, true) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "FLASHLIGHT_OFF",
                patterns = listOf(
                    Regex("""^(?:turn\s+off\s+(?:the\s+)?)?flashlight\s*(?:off)?$"""),
                    Regex("""^(?:turn\s+off\s+(?:the\s+)?)?torch\s*(?:off)?$"""),
                    Regex("""^(?:torch|flashlight|light)\s*(?:band\s*karo|bujhao|band\s*kar\s*do|off\s*karo)$"""),
                    Regex("""^(?:light|torch)\s+off$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> FlashlightHandler.setFlashlight(context, false) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "FLASHLIGHT_TOGGLE",
                patterns = listOf(
                    Regex("""^toggle\s+(?:the\s+)?(?:flashlight|torch)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> FlashlightHandler.toggleFlashlight(context) },
                lockScreenSafe = true
            )
        )

        // ==========================================
        // 2. OPEN APP
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "OPEN_APP",
                patterns = listOf(
                    Regex("""^(?:open|launch|start)\s+(?!song|music|playlist|radio|audio)(.+)$"""),
                    Regex("""^(.+?)\s+(?:kholo|open\s*karo|launch\s*karo)$""")
                ),
                slotExtractor = { input ->
                    val m1 = Regex("""^(?:open|launch|start)\s+(.+)$""").find(input)
                    if (m1 != null) {
                        mapOf("app" to m1.groupValues[1].trim())
                    } else {
                        val m2 = Regex("""^(.+?)\s+(?:kholo|open\s*karo|launch\s*karo)$""").find(input)
                        m2?.let { mapOf("app" to it.groupValues[1].trim()) }
                    }
                },
                handler = { context, slots ->
                    val app = slots["app"] ?: ""
                    AppLauncherHandler.openApp(context, app)
                },
                lockScreenSafe = false
            )
        )

        // ==========================================
        // 3. CALL CONTACT
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "CALL_CONTACT",
                patterns = listOf(
                    Regex("""^(?:call|dial|phone|ring)\s+(.+)$"""),
                    Regex("""^(.+?)\s+(?:ko\s+)?(?:call\s*(?:karo|lagao)|phone\s*(?:karo|lagao))$""")
                ),
                slotExtractor = { input ->
                    val m1 = Regex("""^(?:call|dial|phone|ring)\s+(.+)$""").find(input)
                    if (m1 != null) {
                        mapOf("contact" to m1.groupValues[1].trim())
                    } else {
                        val m2 = Regex("""^(.+?)\s+(?:ko\s+)?(?:call\s*(?:karo|lagao)|phone\s*(?:karo|lagao))$""").find(input)
                        m2?.let { mapOf("contact" to it.groupValues[1].trim()) }
                    }
                },
                handler = { context, slots ->
                    val contact = slots["contact"] ?: ""
                    CallHandler.callContact(context, contact)
                },
                lockScreenSafe = false,
                requiredPermissions = listOf(android.Manifest.permission.READ_CONTACTS)
            )
        )

        // ==========================================
        // 4. TIMER
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "SET_TIMER",
                patterns = listOf(
                    Regex("""^(?:set\s+(?:a\s+)?)?timer\s+(?:for\s+)?(\d+)\s*(minute|minutes|min|second|seconds|sec|hour|hours|hr|ghante|ghanta)$"""),
                    Regex("""^(\d+)\s*(?:minute|min|second|sec|ghante|ghanta)\s*(?:ka\s+)?timer(?:\s+lagao)?$"""),
                    Regex("""^(?:aadhe\s+ghante|half\s+an\s+hour)\s*(?:ka\s+)?timer$""")
                ),
                slotExtractor = { input ->
                    if (input.contains("aadhe ghante") || input.contains("half an hour")) {
                        return@CommandDefinition mapOf("minutes" to "30")
                    }
                    val m1 = Regex("""(\d+)\s*(minute|minutes|min|second|seconds|sec|hour|hours|hr|ghante|ghanta)""").find(input)
                    if (m1 != null) {
                        val num = m1.groupValues[1]
                        val unit = m1.groupValues[2].lowercase()
                        when {
                            unit.startsWith("sec") -> mapOf("seconds" to num)
                            unit.startsWith("hour") || unit.startsWith("ghant") -> mapOf("minutes" to (num.toInt() * 60).toString())
                            else -> mapOf("minutes" to num)
                        }
                    } else null
                },
                handler = { context, slots -> AlarmTimerHandler.setTimer(context, slots) },
                lockScreenSafe = true
            )
        )

        // ==========================================
        // 5. ALARM
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "SET_ALARM",
                patterns = listOf(
                    Regex("""^(?:set\s+(?:an\s+)?)?alarm\s+(?:for\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$"""),
                    Regex("""^wake\s+me\s+up\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$"""),
                    Regex("""^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:baje\s+ka\s+alarm|ka\s+alarm)$""")
                ),
                slotExtractor = { input ->
                    val m = Regex("""(\d{1,2})(?::(\d{2}))?\s*(am|pm)?""").find(input)
                    if (m != null) {
                        val hour = m.groupValues[1]
                        val min = if (m.groupValues[2].isNotBlank()) m.groupValues[2] else "0"
                        val ampm = m.groupValues[3]
                        val map = mutableMapOf("hour" to hour, "minute" to min)
                        if (ampm.isNotBlank()) map["ampm"] = ampm
                        map
                    } else null
                },
                handler = { context, slots -> AlarmTimerHandler.setAlarm(context, slots) },
                lockScreenSafe = true
            )
        )

        // ==========================================
        // 6. VOLUME (Device Level)
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "VOLUME_SET",
                patterns = listOf(
                    Regex("""^(?:set\s+)?volume\s+(?:to\s+)?(\d+)(?:\s*(?:percent|%))?$"""),
                    Regex("""^awaaz\s+(\d+)\s*(?:percent)?(?:\s*karo)?$""")
                ),
                slotExtractor = { input ->
                    val m = Regex("""(\d+)""").find(input)
                    m?.let { mapOf("percent" to it.groupValues[1]) }
                },
                handler = { context, slots ->
                    val pct = slots["percent"]?.toIntOrNull() ?: 50
                    SystemSettingsHandler.setVolume(context, pct)
                },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "VOLUME_UP",
                patterns = listOf(
                    Regex("""(?:music\s+ka\s+|sound\s+ka\s+|gaane\s+ka\s+)?volume\s*(?:badhao|tez|high|up|increase|raise|loud)(?:\s*(?:karo|karna|kardo|krna|kar\s*do|kr\s*do|de|dena|kariye))?"""),
                    Regex("""(?:awaaz|aawaz)\s*(?:badhao|tez|unche|loud|up)(?:\s*(?:karo|karna|kardo|krna|kar\s*do|kr\s*do|de|dena|kariye))?"""),
                    Regex("""(?:raise|increase|turn\s+up|pump\s+up)\s+(?:the\s+)?(?:music\s+)?volume"""),
                    Regex("""(?:music|sound|gaana)\s*(?:tez|unche|loud)\s*(?:karo|karna|krna|kar\s*do)"""),
                    Regex("""(?:volume|awaaz)\s+thod[ai]\s+(?:badhao|tez)"""),
                    Regex("""आवाज़\s*(?:बढ़ाओ|तेज़)"""),
                    Regex("""वॉल्यूम\s*(?:बढ़ाओ|अप)""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> SystemSettingsHandler.adjustVolume(context, 1) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "VOLUME_DOWN",
                patterns = listOf(
                    Regex("""(?:music\s+ka\s+|sound\s+ka\s+|gaane\s+ka\s+)?volume\s*(?:kam|ghatao|dheemi|dheere|down|decrease|lower|low|slow)(?:\s*(?:karo|karna|kardo|krna|kar\s*do|kr\s*do|de|dena|kariye))?"""),
                    Regex("""(?:awaaz|aawaz)\s*(?:kam|dheemi|dheere|ghatao|slow)(?:\s*(?:karo|karna|kardo|krna|kar\s*do|kr\s*do|de|dena|kariye))?"""),
                    Regex("""(?:lower|decrease|turn\s+down|reduce)\s+(?:the\s+)?(?:music\s+)?volume"""),
                    Regex("""(?:music|sound|gaana)\s*(?:dheema|dheere|kam|slow)\s*(?:karo|karna|krna|kar\s*do)"""),
                    Regex("""(?:volume|awaaz)\s+thod[ai]\s+(?:kam|dheere|dheemi)"""),
                    Regex("""आवाज़\s*(?:कम|धीमी|घटाओ)"""),
                    Regex("""वॉल्यूम\s*(?:कम|डाउन)""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> SystemSettingsHandler.adjustVolume(context, -1) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "VOLUME_MUTE",
                patterns = listOf(
                    Regex("""^(?:mute|silence|silent)$"""),
                    Regex("""(?:awaaz|sound|volume|music)\s*(?:mute|silent|band)\s*(?:karo|karna|kar\s*do)?"""),
                    Regex("""आवाज़\s*बंद\s*करो""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> SystemSettingsHandler.muteVolume(context) },
                lockScreenSafe = true
            )
        )

        // ==========================================
        // 7. BATTERY STATUS
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "BATTERY_CHECK",
                patterns = listOf(
                    Regex("""^(?:what(?:'s|\s+is)\s+(?:the\s+|my\s+)?)?battery(?:\s*(?:level|status|percentage|life))?$"""),
                    Regex("""^battery\s*(?:kitni\s*hai|check\s*karo|batao)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> BatteryHandler.getBatteryStatus(context) },
                lockScreenSafe = true
            )
        )

        // ==========================================
        // 8. SYSTEM SETTINGS
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "OPEN_SETTINGS",
                patterns = listOf(
                    Regex("""^(?:open\s+)?(bluetooth|wifi|wi-fi|display|sound)\s+settings$""")
                ),
                slotExtractor = { input ->
                    val m = Regex("""(bluetooth|wifi|wi-fi|display|sound)""").find(input)
                    m?.let { mapOf("type" to it.groupValues[1]) }
                },
                handler = { context, slots ->
                    val type = slots["type"] ?: "settings"
                    SystemSettingsHandler.openSettings(context, type)
                },
                lockScreenSafe = false
            )
        )

        // ==========================================
        // 9. WHATSAPP MESSAGE (Hands-Free Auto-Send & Draft-Not-Send)
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "WHATSAPP_MESSAGE",
                patterns = listOf(
                    Regex("""^(?:draft\s+(?:a\s+)?(?:whatsapp|message)|send\s+a\s+whatsapp|whatsapp|send\s+a\s+message|message)\s+(?:message\s+)?(?:to\s+)?([a-zA-Z0-9\s+]+?)\s+(?:on\s+whatsapp\s+)?(?:saying|that|message)?\s*(.+)$"""),
                    Regex("""^(?:draft\s+to|draft)\s+([a-zA-Z0-9\s+]+?)\s+(?:saying\s+)?(.+)$"""),
                    Regex("""^whatsapp\s+([a-zA-Z0-9\s+]+?)\s+(.+)$"""),
                    Regex("""^message\s+([a-zA-Z0-9\s+]+?)\s+(.+)$"""),
                    Regex("""^([a-zA-Z0-9\s+]+?)\s+(?:ko\s+)?whatsapp\s*(?:karo|bhejo|par\s*message\s*karo|draft\s*karo)\s*(.+)$"""),
                    Regex("""^([a-zA-Z0-9\s+]+?)\s+(?:ko\s+)?message\s*(?:karo|bhejo|draft\s*karo)\s*(.+)$""")
                ),
                slotExtractor = { input ->
                    val isDraft = input.contains("draft") || input.contains("taiyar")
                    val pDraft = Regex("""^(?:draft\s+(?:a\s+)?(?:whatsapp|message)?(?:\s+to)?|draft\s+to)\s+([a-zA-Z0-9\s+]+?)\s+(?:saying\s+|that\s+)?(.+)$""").find(input)
                    if (pDraft != null) {
                        return@CommandDefinition mapOf(
                            "contact" to pDraft.groupValues[1].trim(),
                            "message" to pDraft.groupValues[2].trim(),
                            "draft" to "true"
                        )
                    }
                    val p1 = Regex("""^(?:send\s+a\s+)?(?:whatsapp|message)(?:\s+message)?\s+(?:to\s+)?([a-zA-Z0-9\s+]+?)\s+(?:on\s+whatsapp\s+)?(?:saying|that|message)?\s*(.+)$""").find(input)
                    if (p1 != null) {
                        return@CommandDefinition mapOf(
                            "contact" to p1.groupValues[1].trim(),
                            "message" to p1.groupValues[2].trim(),
                            "draft" to if (isDraft) "true" else "false"
                        )
                    }
                    val p2 = Regex("""^(?:whatsapp|message)\s+([a-zA-Z0-9\s+]+?)\s+(.+)$""").find(input)
                    if (p2 != null) {
                        return@CommandDefinition mapOf(
                            "contact" to p2.groupValues[1].trim(),
                            "message" to p2.groupValues[2].trim(),
                            "draft" to if (isDraft) "true" else "false"
                        )
                    }
                    val p3 = Regex("""^([a-zA-Z0-9\s+]+?)\s+(?:ko\s+)?(?:whatsapp|message)\s*(?:karo|bhejo|par\s*message\s*karo|draft\s*karo)\s*(.+)$""").find(input)
                    if (p3 != null) {
                        return@CommandDefinition mapOf(
                            "contact" to p3.groupValues[1].trim(),
                            "message" to p3.groupValues[2].trim(),
                            "draft" to if (isDraft) "true" else "false"
                        )
                    }
                    null
                },
                handler = { context, slots ->
                    val contact = slots["contact"] ?: ""
                    val message = slots["message"] ?: ""
                    val draftOnly = slots["draft"] == "true"
                    WhatsAppHandler.sendWhatsAppMessage(context, contact, message, draftOnly = draftOnly)
                },
                lockScreenSafe = false,
                requiredPermissions = listOf(android.Manifest.permission.READ_CONTACTS)
            )
        )

        // ==========================================
        // 9b. EMERGENCY & SOS PROTOCOL
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "EMERGENCY_SOS",
                patterns = listOf(
                    Regex("""^(?:emergency|sos|help\s*me|emergency\s*protocol|save\s*me|bachao|madad\s*karo)$"""),
                    Regex("""^(?:send\s+help|i\s+need\s+help\s+now)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ ->
                    val prefs = context.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE)
                    val emergencyContact = prefs.getString("emergency_contact", "112") ?: "112"
                    CallHandler.callContact(context, emergencyContact)
                    CommandResult(
                        success = true,
                        spokenReply = "Emergency protocol activated. Contacting emergency services and broadcasting distress beacon, sir.",
                        actionId = "EMERGENCY_SOS"
                    )
                },
                lockScreenSafe = true
            )
        )

        // ==========================================
        // 9c. CALENDAR & SCHEDULE BRIEFING
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "CALENDAR_BRIEFING",
                patterns = listOf(
                    Regex("""^(?:what(?:'s|\s+is)\s+on\s+my\s+calendar|my\s+meetings(?:\s+today)?|any\s+meetings\s+today|schedule\s+for\s+today|today(?:'s)?\s+schedule|aaj\s+ki\s+meetings|aaj\s+ka\s+schedule)$"""),
                    Regex("""^(?:do\s+i\s+have\s+(?:any\s+)?meetings|what\s+are\s+my\s+meetings)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> CalendarHandler.getCalendarBriefing(context) },
                lockScreenSafe = true,
                requiredPermissions = listOf(android.Manifest.permission.READ_CALENDAR)
            )
        )

        // ==========================================
        // 9d. SMART DO NOT DISTURB
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "SMART_DND",
                patterns = listOf(
                    Regex("""^(?:smart\s+dnd|auto\s+dnd|meeting\s+mode|meeting\s+mode\s+on|dnd\s+mode)$"""),
                    Regex("""^(?:meeting\s+chalu\s+hai|dnd\s+karo)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> CalendarHandler.checkAndApplySmartDnd(context) },
                lockScreenSafe = true,
                requiredPermissions = listOf(android.Manifest.permission.READ_CALENDAR)
            )
        )

        // ==========================================
        // 10. STATUS REPORT & DIAGNOSTICS
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "STATUS_REPORT",
                patterns = listOf(
                    Regex("""^(?:status\s+report|diagnostics|all\s+systems\s+check|systems\s+check|jarvis\s+situation|situation\s+report|kya\s+haal\s+hai|system\s+status)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> DiagnosticsHandler.generateStatusReport(context) },
                lockScreenSafe = true
            )
        )

        // ==========================================
        // 11. STARK PROTOCOLS (Macro Automation)
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "PROTOCOL_NIGHT",
                patterns = listOf(
                    Regex("""^(?:protocol\s+night|night\s+protocol|sleep\s+mode|night\s+mode|good\s*night|so\s*jao)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> StarkProtocolsHandler.executeProtocolNight(context) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "PROTOCOL_PARTY",
                patterns = listOf(
                    Regex("""^(?:house\s+party\s+protocol|party\s+protocol|party\s+mode|party\s*shuru\s*karo)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> StarkProtocolsHandler.executeProtocolParty(context) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "PROTOCOL_STEALTH",
                patterns = listOf(
                    Regex("""^(?:stealth\s+mode|stealth\s+protocol|silent\s+mode|silent\s+protocol|chup\s*raho)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> StarkProtocolsHandler.executeProtocolStealth(context) },
                lockScreenSafe = true
            )
        )

        // ==========================================
        // 12. BRIGHTNESS
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "BRIGHTNESS_SET",
                patterns = listOf(
                    Regex("""^(?:set\s+)?brightness\s+(?:to\s+)?(\d+)\s*(?:percent|%)?$"""),
                    Regex("""^screen\s+brightness\s+(\d+)\s*(?:percent|%)?$"""),
                    Regex("""^brightness\s+(\d+)\s*(?:percent)?(?:\s*karo)?$""")
                ),
                slotExtractor = { input ->
                    val m = Regex("""(\d+)""").find(input)
                    m?.let { mapOf("percent" to it.groupValues[1]) }
                },
                handler = { context, slots ->
                    val pct = slots["percent"]?.toIntOrNull() ?: 50
                    BrightnessHandler.setBrightness(context, pct)
                },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "BRIGHTNESS_UP",
                patterns = listOf(
                    Regex("""^brightness\s*(?:up|increase|raise|bright|brighten)$"""),
                    Regex("""^(?:screen\s+)?(?:brighten|brighter)$"""),
                    Regex("""^brightness\s*(?:badhao|tez\s*karo)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> BrightnessHandler.adjustBrightness(context, 1) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "BRIGHTNESS_DOWN",
                patterns = listOf(
                    Regex("""^brightness\s*(?:down|decrease|lower|dim|reduce)$"""),
                    Regex("""^(?:screen\s+)?(?:dim|dimmer|darker)$"""),
                    Regex("""^brightness\s*(?:kam\s*karo|dheemi\s*karo)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> BrightnessHandler.adjustBrightness(context, -1) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "BRIGHTNESS_AUTO",
                patterns = listOf(
                    Regex("""^auto\s*brightness\s*(?:on|enable)?$"""),
                    Regex("""^(?:turn\s+on\s+)?adaptive\s*brightness$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> BrightnessHandler.setAutoBrightness(context, true) },
                lockScreenSafe = true
            )
        )

        // ==========================================
        // 13. CONNECTIVITY (WiFi / Bluetooth / Airplane / Mobile Data)
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "WIFI_ON",
                patterns = listOf(
                    Regex("""^(?:turn\s+on\s+)?(?:wi-?fi|wifi)\s*(?:on)?$"""),
                    Regex("""^(?:wi-?fi|wifi)\s*(?:chalu\s*karo|on\s*karo|connect\s*karo)$"""),
                    Regex("""^(?:enable|connect)\s+(?:wi-?fi|wifi)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> ConnectivityHandler.setWifi(context, true) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "WIFI_OFF",
                patterns = listOf(
                    Regex("""^(?:turn\s+off\s+)?(?:wi-?fi|wifi)\s*(?:off)?$"""),
                    Regex("""^(?:wi-?fi|wifi)\s*(?:band\s*karo|off\s*karo|disconnect\s*karo)$"""),
                    Regex("""^(?:disable|disconnect)\s+(?:wi-?fi|wifi)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> ConnectivityHandler.setWifi(context, false) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "WIFI_TOGGLE",
                patterns = listOf(
                    Regex("""^toggle\s+(?:wi-?fi|wifi)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> ConnectivityHandler.toggleWifi(context) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "BLUETOOTH_ON",
                patterns = listOf(
                    Regex("""^(?:turn\s+on\s+)?bluetooth\s*(?:on)?$"""),
                    Regex("""^bluetooth\s*(?:chalu\s*karo|on\s*karo|connect\s*karo)$"""),
                    Regex("""^(?:enable|connect)\s+bluetooth$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> ConnectivityHandler.setBluetooth(context, true) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "BLUETOOTH_OFF",
                patterns = listOf(
                    Regex("""^(?:turn\s+off\s+)?bluetooth\s*(?:off)?$"""),
                    Regex("""^bluetooth\s*(?:band\s*karo|off\s*karo|disconnect\s*karo)$"""),
                    Regex("""^(?:disable|disconnect)\s+bluetooth$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> ConnectivityHandler.setBluetooth(context, false) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "BLUETOOTH_TOGGLE",
                patterns = listOf(
                    Regex("""^toggle\s+bluetooth$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> ConnectivityHandler.toggleBluetooth(context) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "AIRPLANE_MODE",
                patterns = listOf(
                    Regex("""^(?:toggle\s+|turn\s+on\s+|turn\s+off\s+)?(?:airplane|aeroplane|flight)\s*mode$"""),
                    Regex("""^(?:airplane|aeroplane|flight)\s*mode\s*(?:on|off|toggle)?$"""),
                    Regex("""^(?:airplane|flight)\s*mode\s*(?:karo|lagao|hatao)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> ConnectivityHandler.openAirplaneSettings(context) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "MOBILE_DATA",
                patterns = listOf(
                    Regex("""^(?:toggle\s+|turn\s+on\s+|turn\s+off\s+)?(?:mobile\s+)?data$"""),
                    Regex("""^(?:mobile\s+)?data\s*(?:on|off|toggle|chalu\s*karo|band\s*karo)$"""),
                    Regex("""^(?:internet|net)\s*(?:on|off|chalu\s*karo|band\s*karo)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> ConnectivityHandler.openMobileDataSettings(context) },
                lockScreenSafe = true
            )
        )

        // ==========================================
        // 14. CLIPBOARD
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "CLIPBOARD_READ",
                patterns = listOf(
                    Regex("""^(?:read\s+)?(?:my\s+)?clipboard$"""),
                    Regex("""^(?:what(?:'s|\s+is)\s+(?:on\s+|in\s+)?(?:my\s+)?)?clipboard$"""),
                    Regex("""^clipboard\s*(?:padho|padh\s*do|batao|read\s*karo)$"""),
                    Regex("""^(?:what\s+did\s+I\s+copy|kya\s+copy\s+kiya)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> ClipboardHandler.readClipboard(context) },
                lockScreenSafe = false
            )
        )

        // ==========================================
        // 15. NOTIFICATIONS
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "READ_NOTIFICATIONS",
                patterns = listOf(
                    Regex("""^(?:read\s+)?(?:my\s+)?notifications$"""),
                    Regex("""^(?:any|check)\s+notifications$"""),
                    Regex("""^(?:koi|kuch)\s+notification(?:s)?\s*(?:aaya|aaye|hai|hain)?$"""),
                    Regex("""^notification(?:s)?\s*(?:padho|padh\s*do|batao|check\s*karo|dikhao)$"""),
                    Regex("""^(?:what\s+are\s+my|show\s+my)\s+notifications$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> NotificationReaderHandler.readNotifications(context) },
                lockScreenSafe = false
            )
        )

        // ==========================================
        // 16. TIME / DATE / DAY
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "GET_TIME",
                patterns = listOf(
                    Regex("""^(?:what(?:'s|\s+is)\s+(?:the\s+)?)?(?:current\s+)?time$"""),
                    Regex("""^(?:tell\s+me\s+the\s+)?time$"""),
                    Regex("""^(?:kitne\s+baje\s+hain|kya\s+time\s+hua|time\s+batao|waqt\s+batao|samay\s+batao)$"""),
                    Regex("""^(?:what\s+time\s+is\s+it|time\s+kya\s+hai|kya\s+time\s+hai)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> TimeDateHandler.getCurrentTime(context) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "GET_DATE",
                patterns = listOf(
                    Regex("""^(?:what(?:'s|\s+is)\s+(?:the\s+|today(?:'s)?\s+)?)?date$"""),
                    Regex("""^(?:today(?:'s)?\s+)?date$"""),
                    Regex("""^(?:aaj\s+)?(?:kya\s+)?(?:date|tarikh)\s*(?:hai|batao)?$"""),
                    Regex("""^(?:what\s+is\s+)?today(?:'s)?\s+date$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> TimeDateHandler.getCurrentDate(context) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "GET_DAY",
                patterns = listOf(
                    Regex("""^(?:what\s+day\s+is\s+(?:it|today)|which\s+day\s+is\s+(?:it|today))$"""),
                    Regex("""^(?:aaj\s+)?(?:kya|kaun\s*sa)\s+(?:din|day)\s*(?:hai)?$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> TimeDateHandler.getDayOfWeek(context) },
                lockScreenSafe = true
            )
        )

        // ==========================================
        // 17. MATH / CALCULATOR
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "CALCULATE",
                patterns = listOf(
                    Regex("""^(?:calculate|compute|solve|what(?:'s|\s+is))\s+(.+)$"""),
                    Regex("""^(\d+(?:\.\d+)?)\s*(?:plus|minus|times|into|x|\*|divided\s+by|multiplied\s+by|percent\s+of)\s+(\d+(?:\.\d+)?)$"""),
                    Regex("""^(?:multiply|multiply\s+karo)\s+(\d+(?:\.\d+)?)\s+(?:by|and|into|with)\s+(\d+(?:\.\d+)?)$"""),
                    Regex("""^(?:hisab\s+karo|calculate\s+karo)\s+(.+)$"""),
                    Regex("""^(\d+(?:\.\d+)?)\s*(?:jama|guna|bata|kam)\s+(\d+(?:\.\d+)?)$""")
                ),
                slotExtractor = { input ->
                    val cleaned = input
                        .replace(Regex("""^(?:calculate|compute|solve|what(?:'s|\s+is)|hisab\s+karo|calculate\s+karo)\s*""", RegexOption.IGNORE_CASE), "")
                        .trim()
                    if (cleaned.isNotBlank()) mapOf("expression" to cleaned) else null
                },
                handler = { context, slots ->
                    val expr = slots["expression"] ?: ""
                    MathHandler.calculate(context, expr)
                },
                lockScreenSafe = true
            )
        )

        // ==========================================
        // 18. NEW STARK PROTOCOLS (Morning, Drive, Focus)
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "PROTOCOL_MORNING",
                patterns = listOf(
                    Regex("""^(?:protocol\s+morning|morning\s+protocol|good\s*morning|subah\s+ho\s+gayi|morning\s+mode)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> StarkProtocolsHandler.executeProtocolMorning(context) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "PROTOCOL_DRIVE",
                patterns = listOf(
                    Regex("""^(?:protocol\s+drive|drive\s+protocol|driving\s+mode|drive\s+mode|gaadi\s+mode)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> StarkProtocolsHandler.executeProtocolDrive(context) },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "PROTOCOL_FOCUS",
                patterns = listOf(
                    Regex("""^(?:protocol\s+focus|focus\s+protocol|focus\s+mode|study\s+mode|dnd|do\s+not\s+disturb|padhai\s+mode)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ -> StarkProtocolsHandler.executeProtocolFocus(context) },
                lockScreenSafe = true
            )
        )

        // ==========================================
        // 19. GREETING & ATTENTION ACKNOWLEDGMENTS
        // ("Hey", "Hey Jarvis", "Hello Jarvis", "Hello", "Are you there", "Sun rahe ho")
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "GREETING_ACK",
                patterns = listOf(
                    Regex("""^(?:hey|hay|he|hello|hlo|hi|yo|namaste|pranam|suno|sun)(?:\s+(?:jarvis|bro|bhai|buddy|there))?$"""),
                    Regex("""^(?:hey|hay|he|hello|hlo|hi|yo|jarvis|suno|sun)$"""),
                    Regex("""^(?:are\s+you\s+there|you\s+there|you\s+listening)$"""),
                    Regex("""^(?:sun\s*rahe\s*ho|sun\s*bhai|kya\s*haal\s*hai|kuch\s*kaam\s*hai)$"""),
                    Regex("""^(?:aur\s*batao|kya\s*chal\s*raha\s*hai|kaise\s*ho)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { _, _ ->
                    val replies = listOf(
                        "At your service, sir. What can I do for you?",
                        "Yes boss, listening.",
                        "Online and ready, sir.",
                        "Haanji sir, boliye kya kaam hai?",
                        "Yes, I'm here. How can I help you?"
                    )
                    CommandResult(
                        success = true,
                        spokenReply = replies.random(),
                        actionId = "GREETING_ACK"
                    )
                },
                lockScreenSafe = true
            )
        )

        // ==========================================
        // 20. USER NAME & PERSONAL IDENTITY (<50ms)
        // ("Do you know my name", "What is my name", "Who am I", "My name is X")
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "USER_NAME_QUERY",
                patterns = listOf(
                    Regex("""^(?:do\s+you\s+(?:know|remember)\s+)?(?:what(?:'s|\s+is)\s+)?(?:my\s+name|who\s+am\s+i|who\s+i\s+am)$"""),
                    Regex("""^(?:do\s+you\s+know\s+who\s+i\s+am|tell\s+me\s+my\s+name)$"""),
                    Regex("""^(?:mera\s+naam\s+(?:kya\s+hai|batao|jante\s+ho)|kya\s+tum\s+mera\s+naam\s+jante\s+ho|main\s+kaun\s+hu)$"""),
                    Regex("""^(?:mujhe\s+jaante\s+ho|mera\s+naam\s+yaad\s+hai)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { context, _ ->
                    val prefs = context.getSharedPreferences("jarvis_user_profile", Context.MODE_PRIVATE)
                    val savedName = prefs.getString("user_name", null)
                    val name = if (!savedName.isNullOrBlank()) savedName else "Ritvik"
                    CommandResult(
                        success = true,
                        spokenReply = "Your name is $name, sir. All core system controls are calibrated to your voice signature.",
                        actionId = "USER_NAME_QUERY"
                    )
                },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "USER_NAME_SET",
                patterns = listOf(
                    Regex("""^(?:my\s+name\s+is|call\s+me|i\s+am)\s+([a-zA-Z0-9\s]+)$"""),
                    Regex("""^(?:mera\s+naam|mujhe)\s+([a-zA-Z0-9\s]+?)\s+(?:hai|bulao|bolo)$""")
                ),
                slotExtractor = { input ->
                    val m1 = Regex("""^(?:my\s+name\s+is|call\s+me|i\s+am)\s+([a-zA-Z0-9\s]+)$""").find(input)
                    if (m1 != null) {
                        mapOf("name" to m1.groupValues[1].trim())
                    } else {
                        val m2 = Regex("""^(?:mera\s+naam|mujhe)\s+([a-zA-Z0-9\s]+?)\s+(?:hai|bulao|bolo)$""").find(input)
                        m2?.let { mapOf("name" to it.groupValues[1].trim()) }
                    }
                },
                handler = { context, slots ->
                    val rawName = slots["name"] ?: "Sir"
                    val name = rawName.split(" ").firstOrNull()?.replaceFirstChar { it.uppercase() } ?: rawName
                    val prefs = context.getSharedPreferences("jarvis_user_profile", Context.MODE_PRIVATE)
                    prefs.edit().putString("user_name", name).apply()
                    CommandResult(
                        success = true,
                        spokenReply = "Understood, sir. I have updated my neural profile to address you as $name.",
                        actionId = "USER_NAME_SET"
                    )
                },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "JARVIS_IDENTITY",
                patterns = listOf(
                    Regex("""^(?:who\s+are\s+you|what\s+is\s+your\s+name|what(?:'s)?\s+your\s+name|tum\s+kaun\s+ho|tumhara\s+naam\s+kya\s+hai|apna\s+naam\s+batao)$"""),
                    Regex("""^(?:introduce\s+yourself|apna\s+intro\s+do|who\s+am\s+i\s+talking\s+to)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { _, _ ->
                    CommandResult(
                        success = true,
                        spokenReply = "I am JARVIS, your Just A Rather Very Intelligent System. Operating directly on your device, sir.",
                        actionId = "JARVIS_IDENTITY"
                    )
                },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "JARVIS_CREATOR",
                patterns = listOf(
                    Regex("""^(?:who\s+(?:created|made|built|programmed|developed)\s+you|who\s+is\s+your\s+(?:creator|developer|maker))$"""),
                    Regex("""^(?:tumhe\s+kisne\s+banaya|tumhe\s+kisne\s+develop\s+kiya|tumhara\s+creator\s+kaun\s+hai)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { _, _ ->
                    CommandResult(
                        success = true,
                        spokenReply = "I was engineered by Ritvik as an advanced on-device AI system.",
                        actionId = "JARVIS_CREATOR"
                    )
                },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "JARVIS_BRAIN_QUERY",
                patterns = listOf(
                    Regex("""^(?:do\s+you\s+have\s+a\s+brain|how\s+smart\s+are\s+you|are\s+you\s+intelligent|tum\s+kitne\s+smart\s+ho|kya\s+tumhare\s+paas\s+brain\s+hai)$"""),
                    Regex("""^(?:how\s+do\s+you\s+work|tum\s+kaise\s+kaam\s+karte\s+ho)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { _, _ ->
                    CommandResult(
                        success = true,
                        spokenReply = "I run on an on-device neural brain with sub-second response times, capable of system controls, knowledge retrieval, and persistent memory.",
                        actionId = "JARVIS_BRAIN_QUERY"
                    )
                },
                lockScreenSafe = true
            )
        )

        // ==========================================
        // 21. SCREEN INTELLIGENCE ("Eyes of Jarvis")
        // ("What is on my screen", "Read my screen", "Summarize this screen", "Screen par kya hai")
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "SCREEN_INTELLIGENCE",
                patterns = listOf(
                    Regex("""^(?:what(?:'s|\s+is)\s+(?:on\s+)?(?:my\s+|the\s+)?screen|what\s+am\s+i\s+looking\s+at)$"""),
                    Regex("""^(?:read\s+(?:this\s+|my\s+)?screen|summarize\s+(?:this\s+|my\s+)?screen)$"""),
                    Regex("""^(?:screen\s*(?:padho|padh\s*do|batao|par\s*kya\s*hai)|kya\s+dikha\s+raha\s+hai)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { _, _ ->
                    val screenText = JarvisAccessibilityService.getScreenVisibleText(600)
                    if (screenText.isNotBlank()) {
                        val sentences = screenText.split(Regex("""[.!?]+""")).map { it.trim() }.filter { it.length > 10 }
                        val summary = if (sentences.size > 2) sentences.take(2).joinToString(". ") + "." else screenText
                        CommandResult(
                            success = true,
                            spokenReply = "On your screen, I see: $summary",
                            actionId = "SCREEN_INTELLIGENCE"
                        )
                    } else {
                        CommandResult(
                            success = true,
                            spokenReply = "I can't inspect the screen right now, sir. Please make sure the Jarvis Accessibility Service is active in Settings.",
                            actionId = "SCREEN_INTELLIGENCE"
                        )
                    }
                },
                lockScreenSafe = false
            )
        )

        // ==========================================
        // 20. LEVEL 6: APP UI AUTOMATION & STOP
        // ("Stop automation", "Stop scrolling", "Scroll down", "Scroll up", "Auto scroll")
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "STOP_AUTOMATION",
                patterns = listOf(
                    Regex("""^(?:stop\s+automation|stop\s+scrolling|scroll\s+band\s*karo|stop\s+scroll|stop|rok\s*do|ruko|band\s*karo)$"""),
                    Regex("""^(?:stop\s+it|ruko\s+bhai|ruk\s*jao|pause\s+scroll)$""")
                ),
                slotExtractor = { emptyMap() },
                handler = { _, _ ->
                    val stopped = JarvisAccessibilityService.stopAutomation()
                    if (stopped) {
                        CommandResult(
                            success = true,
                            spokenReply = "Automation stopped, sir.",
                            actionId = "STOP_AUTOMATION"
                        )
                    } else {
                        CommandResult(
                            success = true,
                            spokenReply = "Stopped, sir.",
                            actionId = "STOP"
                        )
                    }
                },
                lockScreenSafe = true
            )
        )

        COMMANDS.add(
            CommandDefinition(
                id = "AUTO_SCROLL",
                patterns = listOf(
                    Regex("""^(?:start\s+)?auto\s*scroll(?:\s+(?:reels|shorts|feed|tiktok))?(?:\s+(?:every|har)\s+(\d+)\s*(?:seconds|second|sec|s)?)?$"""),
                    Regex("""^(?:scroll|swiping)\s+(?:shuru\s*karo|chalu\s*karo)(?:\s+(\d+)\s*(?:second|sec)\s*me)?$""")
                ),
                slotExtractor = { input ->
                    val m = Regex("""(\d+)\s*(?:seconds|second|sec|s)?""").find(input)
                    val sec = m?.groupValues?.get(1)?.toDoubleOrNull() ?: 10.0
                    mapOf("interval" to sec.toString())
                },
                handler = { _, slots ->
                    val interval = slots["interval"]?.toDoubleOrNull() ?: 10.0
                    val started = JarvisAccessibilityService.startAutoScroll("up", intervalSeconds = interval)
                    if (started) {
                        CommandResult(
                            success = true,
                            spokenReply = "Auto-scrolling every ${interval.toInt()} seconds, sir. Say 'stop' anytime.",
                            actionId = "AUTO_SCROLL"
                        )
                    } else {
                        CommandResult(
                            success = false,
                            spokenReply = "Please enable Jarvis Automation in Accessibility Settings first, sir.",
                            actionId = "AUTO_SCROLL",
                            error = "ACCESSIBILITY_DISABLED"
                        )
                    }
                },
                lockScreenSafe = true
            )
        )
    }

    /**
     * Clean and normalize raw user utterance.
     */
    fun normalize(text: String): String {
        return text
            .lowercase()
            .replace(Regex("""^(?:hey\s+|hello\s+)?jarvis[\s,]*"""), "")
            .replace(Regex("""^(?:mai|main)\s+(?:kuch\s+)?kaam\s+(?:k(?:a)?r\s+rh[a|e]\s*(?:hoon|hu)?|kar\s+raha\s+hoon)[\s,]*"""), "")
            .replace(Regex("""^(?:i(?:'m|\s+am)\s+(?:doing\s+some\s+work|working|busy))[\s,]*"""), "")
            .replace(Regex("""^(?:please\s+|can\s+you\s+|could\s+you\s+|kripya\s+|zara\s+|bhai\s+|yaar\s+|thoda\s+|thodi\s+|suno\s+|are\s+)"""), "")
            .replace(Regex("""[?.!,;]+$"""), "")
            .trim()
    }

    /**
     * Match transcript against registered commands.
     * Returns Pair(definition, slots) if matched, null if this is a music/chat command.
     */
    fun match(rawTranscript: String): Pair<CommandDefinition, Map<String, String>>? {
        val trimmedRaw = rawTranscript.trim().lowercase().replace(Regex("""[?.!,;]+$"""), "")

        // 1. Direct check: If utterance is a greeting ("Hey", "Hey Jarvis", "Hello Jarvis", etc.)
        val greetingCmd = COMMANDS.firstOrNull { it.id == "GREETING_ACK" }
        if (greetingCmd != null) {
            for (pattern in greetingCmd.patterns) {
                if (pattern.matches(trimmedRaw)) {
                    return Pair(greetingCmd, emptyMap())
                }
            }
        }

        // 2. Normalize and check functional commands
        val clean = normalize(rawTranscript)
        if (clean.isBlank()) {
            if (trimmedRaw.contains("hey") || trimmedRaw.contains("hay") || trimmedRaw.contains("hello") || trimmedRaw.contains("hlo") || trimmedRaw.contains("jarvis") || trimmedRaw.contains("suno") || trimmedRaw.contains("sun")) {
                if (greetingCmd != null) {
                    return Pair(greetingCmd, emptyMap())
                }
            }
            return null
        }

        for (cmd in COMMANDS) {
            if (cmd.id == "GREETING_ACK") continue
            for (pattern in cmd.patterns) {
                if (pattern.matches(clean) || pattern.containsMatchIn(clean)) {
                    val slots = cmd.slotExtractor(clean) ?: emptyMap()
                    return Pair(cmd, slots)
                }
            }
        }
        return null
    }

    /**
     * Fast path: If utterance matches a native device control command, executes it immediately (<50ms).
     * Supports "Warp Speed" Multi-Command Chaining across conjunctions ("and", "then", "aur", "fir", "ke baad").
     * Returns CommandResult if handled, or null if it should be delegated to JS (music/LLM).
     */
    fun executeIfMatched(context: Context, rawTranscript: String): CommandResult? {
        val start = System.currentTimeMillis()
        val normalized = normalize(rawTranscript)

        // 1. Check for multi-command chaining conjunctions
        val conjunctionRegex = Regex("""\s+(?:and\s+then|ke\s+baad|and|then|aur|phir|fir)\s+""", RegexOption.IGNORE_CASE)
        val clauses = normalized.split(conjunctionRegex).map { it.trim() }.filter { it.isNotBlank() }

        if (clauses.size > 1) {
            val executedResults = mutableListOf<CommandResult>()
            for (clause in clauses) {
                val matched = match(clause)
                if (matched != null) {
                    val (def, slots) = matched
                    try {
                        val res = def.handler(context, slots)
                        executedResults.add(res)
                    } catch (e: Exception) {
                        Log.w(TAG, "Error in chained clause: '$clause'", e)
                    }
                }
            }

            if (executedResults.isNotEmpty()) {
                val duration = System.currentTimeMillis() - start
                val replies = executedResults.map { it.spokenReply.trim().removeSuffix(".") }
                val combinedSpeech = replies.joinToString(". ") + ", sir."
                Log.i(TAG, "⚡ Warp-Speed chained ${executedResults.size} commands executed in ${duration}ms: '$combinedSpeech'")

                return CommandResult(
                    success = true,
                    spokenReply = combinedSpeech,
                    actionId = "MULTI_CHAIN"
                )
            }
        }

        // 2. Single Command Execution
        val matched = match(rawTranscript) ?: return null
        val (def, slots) = matched
        Log.i(TAG, "⚡ Fast path matched native command '${def.id}' for: '$rawTranscript'")

        return try {
            val result = def.handler(context, slots)
            val duration = System.currentTimeMillis() - start
            Log.i(TAG, "⚡ Executed '${def.id}' in ${duration}ms (success=${result.success})")
            result
        } catch (e: Exception) {
            Log.e(TAG, "Error executing native command '${def.id}'", e)
            CommandResult(
                success = false,
                spokenReply = "Sorry, an error occurred while executing that command.",
                actionId = def.id,
                error = e.message
            )
        }
    }
}

