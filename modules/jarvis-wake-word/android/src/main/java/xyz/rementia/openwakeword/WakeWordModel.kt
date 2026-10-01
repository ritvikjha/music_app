package xyz.rementia.openwakeword

/**
 * Configuration for a wake word model.
 * Vendored from Re-MENTIA/openwakeword-android-kt (Apache 2.0 License).
 *
 * @property name Human-readable name for the wake word
 * @property assetPath Path to the ONNX model file relative to the assets directory
 *                     (mapped to modelPath internally for the ONNX runner)
 * @property threshold Detection threshold between 0.0 and 1.0
 */
data class WakeWordModel(
    val name: String,
    val assetPath: String,
    val threshold: Float = 0.5f
) {
    /** Alias used internally by the engine */
    val modelPath: String get() = assetPath
}
