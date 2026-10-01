package com.ritvik.jammusic.jarvis.handlers

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.ContactsContract
import android.util.Log
import androidx.core.content.ContextCompat
import com.ritvik.jammusic.jarvis.CommandResult

object CallHandler {
    private const val TAG = "JarvisCallHandler"

    fun callContact(context: Context, contactQuery: String): CommandResult {
        val query = contactQuery.trim()
        if (query.isBlank()) {
            return CommandResult(
                success = false,
                spokenReply = "Who would you like to call?",
                actionId = "CALL",
                error = "EMPTY_CONTACT"
            )
        }

        // Direct number check (e.g. "call 9876543210")
        val digitsOnly = query.filter { it.isDigit() || it == '+' }
        if (digitsOnly.length >= 7) {
            return placeCall(context, digitsOnly, digitsOnly)
        }

        // Check contacts permission
        val hasContactsPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_CONTACTS
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasContactsPermission) {
            // Cannot read contacts without permission; try dialing query if numbers present
            return CommandResult(
                success = false,
                spokenReply = "Please grant contacts permission in Settings to call by name.",
                actionId = "CALL",
                error = "PERMISSION_DENIED_READ_CONTACTS"
            )
        }

        // Query Android Contacts Provider
        var matchedName: String? = null
        var matchedNumber: String? = null

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
            Log.e(TAG, "Contacts query error", e)
        }

        // Exact match or fallback query
        if (matchedNumber != null && matchedName != null) {
            return placeCall(context, matchedNumber!!, matchedName!!)
        }

        return CommandResult(
            success = false,
            spokenReply = "Couldn't find $query in your contacts.",
            actionId = "CALL",
            error = "CONTACT_NOT_FOUND"
        )
    }

    private fun placeCall(context: Context, number: String, displayName: String): CommandResult {
        val hasCallPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CALL_PHONE
        ) == PackageManager.PERMISSION_GRANTED

        val cleanNumber = number.filter { it.isDigit() || it == '+' }
        val uri = Uri.parse("tel:$cleanNumber")

        return try {
            val intent = if (hasCallPermission) {
                Intent(Intent.ACTION_CALL, uri)
            } else {
                // Fallback to ACTION_DIAL if CALL_PHONE is not granted
                Intent(Intent.ACTION_DIAL, uri)
            }.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            context.startActivity(intent)
            Log.i(TAG, "Initiated call to $displayName ($cleanNumber)")

            CommandResult(
                success = true,
                spokenReply = "Calling $displayName.",
                actionId = "CALL",
                extraData = mapOf("number" to cleanNumber, "name" to displayName)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch call intent", e)
            CommandResult(
                success = false,
                spokenReply = "Could not start the call.",
                actionId = "CALL",
                error = e.message
            )
        }
    }
}
