package xyz.rementia.openwakeword

/**
 * Represents a wake word detection event.
 * Vendored from Re-MENTIA/openwakeword-android-kt (Apache 2.0 License).
 *
 * @property model The WakeWordModel that triggered this detection
 * @property score The confidence score of the detection (0.0 to 1.0)
 * @property timestamp System timestamp when the detection occurred
 */
data class WakeWordDetection(
    val model: WakeWordModel,
    val score: Float,
    val timestamp: Long = System.currentTimeMillis()
)
