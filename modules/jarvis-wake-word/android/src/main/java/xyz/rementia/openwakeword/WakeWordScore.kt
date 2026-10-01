package xyz.rementia.openwakeword

/**
 * Represents real-time wake word inference scores.
 * Vendored from Re-MENTIA/openwakeword-android-kt (Apache 2.0 License).
 *
 * @property model The wake word model being evaluated
 * @property score The current inference score (0.0 to 1.0)
 * @property timestamp The time when this score was calculated
 */
data class WakeWordScore(
    val model: WakeWordModel,
    val score: Float,
    val timestamp: Long = System.currentTimeMillis()
)
