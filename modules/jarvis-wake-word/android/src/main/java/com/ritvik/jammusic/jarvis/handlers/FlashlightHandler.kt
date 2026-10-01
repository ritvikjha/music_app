package com.ritvik.jammusic.jarvis.handlers

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Build
import android.util.Log
import com.ritvik.jammusic.jarvis.CommandResult

object FlashlightHandler {
    private const val TAG = "JarvisFlashlight"

    @Volatile
    private var isTorchOn = false

    fun isEnabled(): Boolean = isTorchOn

    fun setFlashlight(context: Context, enable: Boolean): CommandResult {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return CommandResult(
                success = false,
                spokenReply = "Flashlight control is not supported on this Android version.",
                actionId = "FLASHLIGHT",
                error = "API_TOO_LOW"
            )
        }

        return try {
            val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
                ?: return CommandResult(
                    success = false,
                    spokenReply = "Camera service unavailable.",
                    actionId = "FLASHLIGHT",
                    error = "NO_CAMERA_SERVICE"
                )

            val cameraId = cameraManager.cameraIdList.firstOrNull { id ->
                val chars = cameraManager.getCameraCharacteristics(id)
                chars.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true &&
                chars.get(CameraCharacteristics.LENS_FACING) == CameraCharacteristics.LENS_FACING_BACK
            } ?: cameraManager.cameraIdList.firstOrNull() ?: "0"

            cameraManager.setTorchMode(cameraId, enable)
            isTorchOn = enable

            val reply = if (enable) "Flashlight turned on." else "Flashlight turned off."
            Log.i(TAG, "Flashlight set to $enable on camera $cameraId")

            CommandResult(
                success = true,
                spokenReply = reply,
                actionId = if (enable) "FLASHLIGHT_ON" else "FLASHLIGHT_OFF",
                extraData = mapOf("torchState" to enable)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to toggle flashlight", e)
            CommandResult(
                success = false,
                spokenReply = "Sorry, couldn't access the flashlight.",
                actionId = "FLASHLIGHT",
                error = e.message
            )
        }
    }

    fun toggleFlashlight(context: Context): CommandResult {
        return setFlashlight(context, !isTorchOn)
    }
}
