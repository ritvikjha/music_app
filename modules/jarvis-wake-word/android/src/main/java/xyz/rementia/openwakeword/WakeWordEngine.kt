package xyz.rementia.openwakeword

import android.content.Context
import android.content.res.AssetManager
import android.util.Log
import xyz.rementia.openwakeword.audio.AudioProcessor
import xyz.rementia.openwakeword.audio.AudioRecorder
import xyz.rementia.openwakeword.ml.OnnxModelRunner
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

/**
 * Main entry point for wake word detection using ONNX Runtime.
 * Vendored from Re-MENTIA/openwakeword-android-kt (Apache 2.0 License).
 *
 * @property context Android context for accessing resources and assets
 * @property models List of wake word models to detect
 * @property detectionMode Mode for handling multiple simultaneous detections
 * @property detectionCooldownMs Cooldown period in milliseconds to prevent duplicate detections
 * @property scope CoroutineScope for background operations
 */
class WakeWordEngine(
    private val context: Context,
    private val models: List<WakeWordModel>,
    private val detectionMode: DetectionMode = DetectionMode.SINGLE_BEST,
    private val detectionCooldownMs: Long = 2000L,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.Default)
) {

    companion object {
        private const val TAG = "WakeWordEngine"
    }

    private val assetManager: AssetManager = context.assets
    private val audioRecorder = AudioRecorder(context)
    private val modelProcessors = mutableMapOf<WakeWordModel, ModelProcessor>()
    private val detectionCooldowns = mutableMapOf<String, Long>()

    private val _detections = MutableSharedFlow<WakeWordDetection>()
    private val _scores = MutableSharedFlow<WakeWordScore>()

    val detections: Flow<WakeWordDetection> = _detections.asSharedFlow()
    val scores: Flow<WakeWordScore> = _scores.asSharedFlow()

    val currentAudioSessionId: Int
        get() = audioRecorder.currentAudioSessionId

    val isRunning: Boolean
        get() = recordingJob?.isActive == true

    private var recordingJob: Job? = null

    init {
        require(models.isNotEmpty()) { "At least one wake word model must be provided" }
        initializeModels()
    }

    private fun initializeModels() {
        models.forEach { model ->
            val processor = ModelProcessor(assetManager, model)
            modelProcessors[model] = processor
        }
    }

    fun start() {
        require(audioRecorder.hasRecordPermission()) {
            "RECORD_AUDIO permission is required for wake word detection"
        }

        recordingJob?.cancel()
        recordingJob = scope.launch {
            while (isActive) {
                try {
                    audioRecorder.startRecording()
                        .collect { audioBuffer ->
                            val detectionResults = models.mapIndexed { index, model ->
                                async {
                                    try {
                                        val processor = modelProcessors[model]!!
                                        val score = processor.process(audioBuffer)
                                        Log.d(TAG, "${model.name} - Score: ${String.format("%.5f", score)}, Threshold: ${String.format("%.5f", model.threshold)}")

                                        _scores.emit(WakeWordScore(model, score))

                                        if (score > model.threshold) {
                                            Log.d(TAG, "DETECTION! ${model.name} - Score: ${String.format("%.5f", score)} > Threshold: ${String.format("%.5f", model.threshold)}")
                                            DetectionResult(
                                                model = model,
                                                score = score,
                                                difference = score - model.threshold,
                                                index = index
                                            )
                                        } else {
                                            null
                                        }
                                    } catch (e: Exception) {
                                        Log.e(TAG, "Error processing model ${model.name}", e)
                                        e.printStackTrace()
                                        null
                                    }
                                }
                            }.awaitAll().filterNotNull()

                            when (detectionMode) {
                                DetectionMode.SINGLE_BEST -> {
                                    detectionResults.maxByOrNull { result ->
                                        result.difference * 1000 - result.index * 0.001
                                    }?.let { result ->
                                        emitDetection(result.model, result.score)
                                    }
                                }
                                DetectionMode.ALL -> {
                                    detectionResults.forEach { result ->
                                        emitDetection(result.model, result.score)
                                    }
                                }
                            }
                        }
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    Log.w(TAG, "WakeWordEngine recording stream encountered error (${e.message}). Reconnecting in 500ms...", e)
                    delay(500L)
                }
            }
        }
    }

    private suspend fun emitDetection(model: WakeWordModel, score: Float) {
        val now = System.currentTimeMillis()
        val lastDetection = detectionCooldowns[model.name]

        if (lastDetection == null || detectionCooldownMs == 0L || now - lastDetection >= detectionCooldownMs) {
            Log.d(TAG, "Emitting detection for ${model.name} with score ${String.format("%.5f", score)}")
            _detections.emit(
                WakeWordDetection(
                    model = model,
                    score = score
                )
            )
            detectionCooldowns[model.name] = now
        } else {
            Log.d(TAG, "Detection skipped due to cooldown: ${model.name}")
        }
    }

    fun stop() {
        recordingJob?.cancel()
        recordingJob = null
    }

    fun release() {
        stop()
        modelProcessors.values.forEach { it.close() }
        modelProcessors.clear()
    }

    private data class DetectionResult(
        val model: WakeWordModel,
        val score: Float,
        val difference: Float,
        val index: Int
    )

    private inner class ModelProcessor(
        assetManager: AssetManager,
        private val model: WakeWordModel
    ) : AutoCloseable {

        private val modelRunner = OnnxModelRunner(assetManager, model.modelPath)
        private val audioProcessor = AudioProcessor(assetManager, modelRunner)

        fun process(audioBuffer: FloatArray): Float {
            return audioProcessor.predictWakeWord(audioBuffer)
        }

        override fun close() {
            audioProcessor.close()
            modelRunner.close()
        }
    }
}
