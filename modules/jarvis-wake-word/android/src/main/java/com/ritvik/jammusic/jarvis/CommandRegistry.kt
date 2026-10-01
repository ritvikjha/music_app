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
                    Regex("""^volume\s*(?:up|increase|raise|high)$"""),
                    Regex("""^awaaz\s*(?:badhao|tez\s*karo|unche\s*karo)$""")
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
                    Regex("""^volume\s*(?:down|decrease|lower|low)$"""),
                    Regex("""^awaaz\s*(?:kam\s*karo|dheemi\s*karo)$""")
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
                    Regex("""^(?:mute|silence)$"""),
                    Regex("""^awaaz\s*band\s*karo$""")
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
        // 9. WHATSAPP MESSAGE (Hands-Free Auto-Send)
        // ==========================================
        COMMANDS.add(
            CommandDefinition(
                id = "WHATSAPP_MESSAGE",
                patterns = listOf(
                    Regex("""^(?:send\s+a\s+)?whatsapp(?:\s+message)?\s+(?:to\s+)?([a-zA-Z0-9\s+]+?)\s+(?:saying|that|message)?\s*(.+)$"""),
                    Regex("""^(?:send\s+a\s+)?message\s+(?:to\s+)?([a-zA-Z0-9\s+]+?)\s+(?:on\s+whatsapp\s+)?(?:saying|that|message)?\s*(.+)$"""),
                    Regex("""^whatsapp\s+([a-zA-Z0-9\s+]+?)\s+(.+)$"""),
                    Regex("""^message\s+([a-zA-Z0-9\s+]+?)\s+(.+)$"""),
                    Regex("""^([a-zA-Z0-9\s+]+?)\s+(?:ko\s+)?whatsapp\s*(?:karo|bhejo|par\s*message\s*karo)\s*(.+)$"""),
                    Regex("""^([a-zA-Z0-9\s+]+?)\s+(?:ko\s+)?message\s*(?:karo|bhejo)\s*(.+)$""")
                ),
                slotExtractor = { input ->
                    val p1 = Regex("""^(?:send\s+a\s+)?(?:whatsapp|message)(?:\s+message)?\s+(?:to\s+)?([a-zA-Z0-9\s+]+?)\s+(?:on\s+whatsapp\s+)?(?:saying|that|message)?\s*(.+)$""").find(input)
                    if (p1 != null) {
                        return@CommandDefinition mapOf("contact" to p1.groupValues[1].trim(), "message" to p1.groupValues[2].trim())
                    }
                    val p2 = Regex("""^(?:whatsapp|message)\s+([a-zA-Z0-9\s+]+?)\s+(.+)$""").find(input)
                    if (p2 != null) {
                        return@CommandDefinition mapOf("contact" to p2.groupValues[1].trim(), "message" to p2.groupValues[2].trim())
                    }
                    val p3 = Regex("""^([a-zA-Z0-9\s+]+?)\s+(?:ko\s+)?(?:whatsapp|message)\s*(?:karo|bhejo|par\s*message\s*karo)\s*(.+)$""").find(input)
                    if (p3 != null) {
                        return@CommandDefinition mapOf("contact" to p3.groupValues[1].trim(), "message" to p3.groupValues[2].trim())
                    }
                    null
                },
                handler = { context, slots ->
                    val contact = slots["contact"] ?: ""
                    val message = slots["message"] ?: ""
                    WhatsAppHandler.sendWhatsAppMessage(context, contact, message)
                },
                lockScreenSafe = false,
                requiredPermissions = listOf(android.Manifest.permission.READ_CONTACTS)
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
    }

    /**
     * Clean and normalize raw user utterance.
     */
    fun normalize(text: String): String {
        return text
            .lowercase()
            .replace(Regex("""^(?:hey\s+|hello\s+)?jarvis[\s,]*"""), "")
            .replace(Regex("""^(?:please\s+|can\s+you\s+|kripya\s+|zara\s+|bhai\s+)"""), "")
            .replace(Regex("""[?.!,;]+$"""), "")
            .trim()
    }

    /**
     * Match transcript against registered commands.
     * Returns Pair(definition, slots) if matched, null if this is a music/chat command.
     */
    fun match(rawTranscript: String): Pair<CommandDefinition, Map<String, String>>? {
        val clean = normalize(rawTranscript)
        if (clean.isBlank()) return null

        for (cmd in COMMANDS) {
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
    suspend fun executeIfMatched(context: Context, rawTranscript: String): CommandResult? {
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

