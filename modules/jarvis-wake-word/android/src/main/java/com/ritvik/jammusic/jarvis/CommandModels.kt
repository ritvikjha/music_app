package com.ritvik.jammusic.jarvis

import android.content.Context

/**
 * Result returned by an on-device native command execution.
 */
data class CommandResult(
    val success: Boolean,
    val spokenReply: String,
    val actionId: String,
    val error: String? = null,
    val extraData: Map<String, Any> = emptyMap()
)

/**
 * Typed definition of a native on-device command for <50ms zero-JS execution.
 */
data class CommandDefinition(
    val id: String,
    val patterns: List<Regex>,
    val slotExtractor: (String) -> Map<String, String>?,
    val handler: (Context, Map<String, String>) -> CommandResult,
    val lockScreenSafe: Boolean,
    val requiredPermissions: List<String> = emptyList()
)
