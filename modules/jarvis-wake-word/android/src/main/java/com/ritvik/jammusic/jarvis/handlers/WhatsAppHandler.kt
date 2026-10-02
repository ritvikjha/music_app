package com.ritvik.jammusic.jarvis.handlers

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.ContactsContract
import android.util.Log
import androidx.core.content.ContextCompat
import com.ritvik.jammusic.jarvis.CommandResult
import com.ritvik.jammusic.jarvis.JarvisAccessibilityService

/**
 * WhatsAppHandler — Native WhatsApp message launcher with Hands-Free Auto-Send support.
 */
object WhatsAppHandler {
    private const val TAG = "JarvisWhatsAppHandler"

    fun sendWhatsAppMessage(context: Context, contactQuery: String, messageText: String, draftOnly: Boolean = false): CommandResult {
        val query = contactQuery.trim()
        val message = messageText.trim()

        if (query.isBlank()) {
            return CommandResult(
                success = false,
                spokenReply = "Who would you like to WhatsApp?",
                actionId = "WHATSAPP_MESSAGE",
                error = "EMPTY_CONTACT"
            )
        }

        if (message.isBlank()) {
            return CommandResult(
                success = false,
                spokenReply = "What would you like to say to $query?",
                actionId = "WHATSAPP_MESSAGE",
                error = "EMPTY_MESSAGE"
            )
        }

        var matchedName: String? = null
        var matchedNumber: String? = null

        // 1. Direct phone number check (e.g., "whatsapp 9876543210 hello")
        val digitsOnly = query.filter { it.isDigit() || it == '+' }
        if (digitsOnly.length >= 7) {
            matchedNumber = digitsOnly
            matchedName = query
        } else {
            // 2. Query Android Contacts Provider
            val hasContactsPermission = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.READ_CONTACTS
            ) == PackageManager.PERMISSION_GRANTED

            if (hasContactsPermission) {
                try {
                    val cursor = context.contentResolver.query(
                        ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                        arrayOf(
                            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                            ContactsContract.CommonDataKinds.Phone.NUMBER
                        ),
                        "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} LIKE ?",
                        arrayOf("%$query%"),
                        null
                    )

                    cursor?.use {
                        if (it.moveToFirst()) {
                            matchedName = it.getString(it.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME))
                            matchedNumber = it.getString(it.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.NUMBER))
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error querying contacts for WhatsApp", e)
                }
            }
        }

        // 3. Format phone number for WhatsApp API
        val targetName = matchedName ?: query
        val cleanNumber = if (matchedNumber != null) formatPhoneForWhatsApp(matchedNumber!!) else null

        // 4. Arm Accessibility Service for hands-free auto-send only if NOT draftOnly
        val a11yActive = JarvisAccessibilityService.isServiceEnabled && !draftOnly
        if (a11yActive) {
            JarvisAccessibilityService.triggerAutoSend(targetName)
        }

        // 5. Construct WhatsApp Intent
        val intent = try {
            if (!cleanNumber.isNullOrBlank()) {
                val url = "https://api.whatsapp.com/send?phone=$cleanNumber&text=${Uri.encode(message)}"
                Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                    setPackage("com.whatsapp")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
            } else {
                // If number could not be found, share message text directly into WhatsApp
                Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    setPackage("com.whatsapp")
                    putExtra(Intent.EXTRA_TEXT, message)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error building WhatsApp intent", e)
            if (a11yActive) JarvisAccessibilityService.cancelAutoSend()
            return CommandResult(
                success = false,
                spokenReply = "Could not prepare WhatsApp message.",
                actionId = "WHATSAPP_MESSAGE",
                error = e.message
            )
        }

        // 6. Launch WhatsApp Intent
        return try {
            context.startActivity(intent)
            Log.i(TAG, "WhatsApp chat opened for $targetName (handsFreeAutoSend=$a11yActive, draftOnly=$draftOnly)")

            val spokenReply = when {
                draftOnly -> "Drafted your message to $targetName, sir. Review and tap send."
                a11yActive -> "Sending WhatsApp to $targetName..."
                else -> "Opening WhatsApp for $targetName. Please tap send."
            }

            CommandResult(
                success = true,
                spokenReply = spokenReply,
                actionId = "WHATSAPP_MESSAGE",
                extraData = mapOf(
                    "contact" to targetName,
                    "phone" to (cleanNumber ?: ""),
                    "message" to message,
                    "autoSend" to a11yActive.toString(),
                    "draftOnly" to draftOnly.toString()
                )
            )
        } catch (e: ActivityNotFoundException) {
            if (a11yActive) JarvisAccessibilityService.cancelAutoSend()
            Log.w(TAG, "WhatsApp is not installed on this device")
            CommandResult(
                success = false,
                spokenReply = "WhatsApp is not installed on your phone.",
                actionId = "WHATSAPP_MESSAGE",
                error = "WHATSAPP_NOT_INSTALLED"
            )
        } catch (e: Exception) {
            if (a11yActive) JarvisAccessibilityService.cancelAutoSend()
            Log.e(TAG, "Failed to launch WhatsApp", e)
            CommandResult(
                success = false,
                spokenReply = "Could not open WhatsApp.",
                actionId = "WHATSAPP_MESSAGE",
                error = e.message
            )
        }
    }

    /**
     * Normalizes phone number into international format without leading '+' or '0'.
     * Defaulting to country code 91 (India) if 10-digit number.
     */
    private fun formatPhoneForWhatsApp(raw: String): String {
        val digits = raw.filter { it.isDigit() }
        return when {
            digits.length == 10 -> "91$digits" // standard Indian 10-digit mobile
            digits.length == 11 && digits.startsWith("0") -> "91" + digits.substring(1)
            else -> digits
        }
    }
}
