package xyz.rementia.openwakeword.ml

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.res.AssetManager
import android.util.Log
import java.io.IOException

/**
 * Handles ONNX model loading and inference for wake word detection.
 * Vendored from Re-MENTIA/openwakeword-android-kt (Apache 2.0 License).
 */
internal class OnnxModelRunner(
    private val assetManager: AssetManager,
    private val modelPath: String
) : AutoCloseable {

    private val env: OrtEnvironment = OrtEnvironment.getEnvironment()
    private val session: OrtSession = createSession()

    companion object {
        private const val TAG = "OnnxModelRunner"
    }

    private fun createSession(): OrtSession {
        return try {
            assetManager.open(modelPath).use { inputStream ->
                val modelBytes = inputStream.readBytes()
                env.createSession(modelBytes)
            }
        } catch (e: IOException) {
            throw RuntimeException("Failed to load model: $modelPath", e)
        }
    }

    fun predictWakeWord(inputArray: Array<Array<FloatArray>>): Float {
        var inputTensor: OnnxTensor? = null

        return try {
            inputTensor = OnnxTensor.createTensor(env, inputArray)

            session.run(mapOf(session.inputNames.first() to inputTensor)).use { outputs ->
                @Suppress("UNCHECKED_CAST")
                val result = outputs[0].value as Array<FloatArray>
                val score = result[0][0]
                Log.d(TAG, "Model: $modelPath - Raw inference output: ${String.format("%.5f", score)}")
                score
            }
        } catch (e: Exception) {
            throw RuntimeException("Failed to run inference", e)
        } finally {
            inputTensor?.close()
        }
    }

    override fun close() {
        session.close()
    }
}
