package com.ritvik.jammusic.jarvis.handlers

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.hardware.camera2.*
import android.media.ImageReader
import android.os.Handler
import android.os.HandlerThread
import android.util.Base64
import android.util.Log
import androidx.core.content.ContextCompat
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * VisionHandler — On-device silent camera snapshot utility for Jarvis Multimodal Vision.
 *
 * Captures a single still JPEG frame in ~150-250ms via Android's Camera2 API
 * without opening a full-screen preview or disrupting user activity.
 * Returns the image encoded as a clean Base64 JPEG string ready for multimodal LLM analysis.
 */
object VisionHandler {

    private const val TAG = "JarvisVision"
    private const val CAPTURE_WIDTH = 1024
    private const val CAPTURE_HEIGHT = 768
    private const val CAPTURE_TIMEOUT_MS = 3500L

    fun takeSnapshot(context: Context): String? {
        val hasPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasPermission) {
            Log.w(TAG, "Cannot take snapshot: CAMERA permission is not granted")
            return null
        }

        val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
        if (cameraManager == null) {
            Log.e(TAG, "CameraManager unavailable on this device")
            return null
        }

        val handlerThread = HandlerThread("JarvisVisionCapture").apply { start() }
        val handler = Handler(handlerThread.looper)

        var cameraDevice: CameraDevice? = null
        var captureSession: CameraCaptureSession? = null
        var resultBase64: String? = null
        val latch = CountDownLatch(1)

        val imageReader = ImageReader.newInstance(
            CAPTURE_WIDTH,
            CAPTURE_HEIGHT,
            ImageFormat.JPEG,
            2
        )

        fun cleanup() {
            try {
                captureSession?.close()
            } catch (e: Exception) {}
            captureSession = null

            try {
                cameraDevice?.close()
            } catch (e: Exception) {}
            cameraDevice = null

            try {
                imageReader.close()
            } catch (e: Exception) {}

            try {
                handlerThread.quitSafely()
            } catch (e: Exception) {}
        }

        imageReader.setOnImageAvailableListener({ reader ->
            try {
                val image = reader.acquireLatestImage()
                if (image != null) {
                    val planes = image.planes
                    val buffer = planes[0].buffer
                    val bytes = ByteArray(buffer.remaining())
                    buffer.get(bytes)
                    image.close()

                    resultBase64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                    Log.i(TAG, "📸 Captured vision frame successfully (${bytes.size} bytes)")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error acquiring camera image", e)
            } finally {
                latch.countDown()
            }
        }, handler)

        try {
            val cameraId = cameraManager.cameraIdList.firstOrNull { id ->
                val chars = cameraManager.getCameraCharacteristics(id)
                val facing = chars.get(CameraCharacteristics.LENS_FACING)
                facing == CameraCharacteristics.LENS_FACING_BACK
            } ?: cameraManager.cameraIdList.firstOrNull()

            if (cameraId == null) {
                Log.w(TAG, "No suitable camera ID found")
                cleanup()
                return null
            }

            cameraManager.openCamera(cameraId, object : CameraDevice.StateCallback() {
                override fun onOpened(camera: CameraDevice) {
                    cameraDevice = camera
                    try {
                        val surface = imageReader.surface
                        val surfaces = listOf(surface)

                        @Suppress("DEPRECATION")
                        camera.createCaptureSession(surfaces, object : CameraCaptureSession.StateCallback() {
                            override fun onConfigured(session: CameraCaptureSession) {
                                captureSession = session
                                try {
                                    val requestBuilder = camera.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE).apply {
                                        addTarget(surface)
                                        set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE)
                                        set(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_ON)
                                    }
                                    session.capture(requestBuilder.build(), null, handler)
                                    Log.d(TAG, "Triggered Camera2 still capture request")
                                } catch (e: Exception) {
                                    Log.e(TAG, "Failed capture request", e)
                                    latch.countDown()
                                }
                            }

                            override fun onConfigureFailed(session: CameraCaptureSession) {
                                Log.e(TAG, "Camera capture session configuration failed")
                                latch.countDown()
                            }
                        }, handler)
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed creating camera capture session", e)
                        latch.countDown()
                    }
                }

                override fun onDisconnected(camera: CameraDevice) {
                    Log.w(TAG, "Camera disconnected")
                    latch.countDown()
                }

                override fun onError(camera: CameraDevice, error: Int) {
                    Log.e(TAG, "Camera error code: $error")
                    latch.countDown()
                }
            }, handler)

            latch.await(CAPTURE_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        } catch (e: SecurityException) {
            Log.e(TAG, "Camera security exception", e)
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error in vision capture", e)
        } finally {
            cleanup()
        }

        return resultBase64
    }
}
