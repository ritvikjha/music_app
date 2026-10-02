package com.ritvik.jammusic.jarvis.safety

import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import xyz.rementia.openwakeword.ml.EmbeddingModel
import xyz.rementia.openwakeword.ml.MelSpectrogram
import kotlin.math.sqrt

/**
 * SpeakerVerificationManager — On-Device Voice ID & Speaker Verification.
 *
 * Runs locally via ONNX Runtime using Google's / openWakeWord's speech embedding model (96-d d-vector).
 * Gated behind cosine similarity matching against the owner's enrolled voiceprint.
 */
object SpeakerVerificationManager {
    private const val TAG = "JarvisVoiceID"
    private const val PREFS_NAME = "JarvisVoiceIdPrefs"
    private const val KEY_VOICEPRINT = "enrolled_voiceprint_vector"
    private const val KEY_ENROLLED = "is_voice_enrolled"
    private const val KEY_THRESHOLD = "similarity_threshold"
    private const val KEY_ENROLLMENT_COUNT = "enrollment_samples_count"
    private const val KEY_REQUIRE_VOICE_ID = "require_voice_id_for_sensitive"

    /** Tunable threshold balancing False Acceptance Rate (FAR) vs False Rejection Rate (FRR) */
    const val DEFAULT_SIMILARITY_THRESHOLD = 0.68f

    // In-memory buffer for active multi-sample enrollment
    private val enrollmentSamples = mutableListOf<FloatArray>()

    // Window config matching openWakeWord embedding model architecture
    private const val WINDOW_SIZE = 76
    private const val STEP_SIZE = 8
    private const val MEL_SPEC_FRAMES = 32
    private const val EMBEDDING_DIM = 96

    data class VerificationResult(
        val isVerified: Boolean,
        val similarity: Float,
        val threshold: Float,
        val reason: String
    )

    /**
     * Set of action IDs and intent tags categorized as Sensitive (gated by Voice ID).
     */
    private val SENSITIVE_ACTIONS = setOf(
        "WHATSAPP_MESSAGE",
        "CALL",
        "EMERGENCY_SOS",
        "EMERGENCY",
        "READ_NOTIFICATIONS",
        "NOTIFICATION_READER",
        "AUTO_SCROLL",
        "STOP_AUTOMATION",
        "TAP_ELEMENT",
        "TYPE_TEXT",
        "CLEAR_QUEUE",
        "DELETE_ROUTINE",
        "DELETE_NOTE",
        "SYSTEM_SETTINGS",
        "PAYMENT",
        "GPAY"
    )

    /**
     * Determines whether an action or user utterance requires verified Voice ID.
     */
    fun isSensitive(actionId: String, utterance: String = ""): Boolean {
        if (SENSITIVE_ACTIONS.contains(actionId.uppercase())) return true

        val lower = utterance.lowercase()
        return lower.contains("whatsapp") ||
                lower.contains("message") ||
                lower.contains("call") ||
                lower.contains("pay") ||
                lower.contains("transfer") ||
                lower.contains("notification") ||
                lower.contains("read my messages") ||
                lower.contains("delete") ||
                lower.contains("clear") ||
                lower.contains("emergency") ||
                lower.contains("sos")
    }

    /**
     * Check if the user has enrolled their voiceprint.
     */
    fun isEnrolled(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean(KEY_ENROLLED, false) && !prefs.getString(KEY_VOICEPRINT, null).isNullOrBlank()
    }

    /**
     * Check whether Voice ID gating is strictly enforced for sensitive commands.
     * Defaults to true if a voiceprint is enrolled.
     */
    fun isVoiceIdRequired(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean(KEY_REQUIRE_VOICE_ID, isEnrolled(context))
    }

    /**
     * Enable or disable Voice ID enforcement.
     */
    fun setVoiceIdRequired(context: Context, required: Boolean) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_REQUIRE_VOICE_ID, required).apply()
        Log.i(TAG, "Voice ID requirement set to: $required")
    }

    /**
     * Get configured similarity threshold (default 0.68).
     */
    fun getThreshold(context: Context): Float {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getFloat(KEY_THRESHOLD, DEFAULT_SIMILARITY_THRESHOLD)
    }

    /**
     * Set similarity threshold.
     */
    fun setThreshold(context: Context, threshold: Float) {
        val clamped = threshold.coerceIn(0.40f, 0.95f)
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putFloat(KEY_THRESHOLD, clamped).apply()
        Log.i(TAG, "Voice ID similarity threshold set to $clamped")
    }

    /**
     * Reset active enrollment session in memory.
     */
    fun startEnrollmentSession() {
        enrollmentSamples.clear()
        Log.i(TAG, "Started fresh voice enrollment session")
    }

    /**
     * Record a ~2.5s voice sample, extract 96-d embedding, and accumulate into enrollment session.
     * Once 3 samples are accumulated, averages and saves the reference voiceprint.
     */
    fun recordAndAddEnrollmentSample(context: Context, durationMs: Long = 2500L): Map<String, Any> {
        val audio = recordAudioDirectly(durationMs)
        if (audio == null || audio.isEmpty()) {
            return mapOf(
                "success" to false,
                "error" to "Could not record microphone audio. Ensure permission is granted."
            )
        }

        val embedding = extractEmbedding(context, audio)
        if (embedding == null) {
            return mapOf(
                "success" to false,
                "error" to "Audio too short or quiet. Please speak clearly into the microphone."
            )
        }

        enrollmentSamples.add(embedding)
        val currentCount = enrollmentSamples.size

        if (currentCount >= 3) {
            // Average all 3 embeddings to create master reference voiceprint
            val masterVector = FloatArray(EMBEDDING_DIM)
            for (vec in enrollmentSamples) {
                for (dim in 0 until EMBEDDING_DIM) {
                    masterVector[dim] += vec[dim]
                }
            }
            for (dim in 0 until EMBEDDING_DIM) {
                masterVector[dim] /= currentCount.toFloat()
            }
            normalizeL2(masterVector)

            saveVoiceprint(context, masterVector, currentCount)
            enrollmentSamples.clear()

            return mapOf(
                "success" to true,
                "sampleIndex" to currentCount,
                "totalRequired" to 3,
                "isComplete" to true,
                "message" to "Voice ID enrolled successfully!"
            )
        } else {
            return mapOf(
                "success" to true,
                "sampleIndex" to currentCount,
                "totalRequired" to 3,
                "isComplete" to false,
                "message" to "Sample $currentCount of 3 captured."
            )
        }
    }

    private fun recordAudioDirectly(durationMs: Long): FloatArray? {
        val sampleRate = 16000
        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val audioFormat = AudioFormat.ENCODING_PCM_16BIT
        val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
        val bufferSize = maxOf(minBufferSize, 4096)

        var record: AudioRecord? = null
        try {
            record = AudioRecord(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                sampleRate,
                channelConfig,
                audioFormat,
                bufferSize
            )
            if (record.state != AudioRecord.STATE_INITIALIZED) {
                record.release()
                record = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    sampleRate,
                    channelConfig,
                    audioFormat,
                    bufferSize
                )
            }
            if (record.state != AudioRecord.STATE_INITIALIZED) {
                Log.e(TAG, "AudioRecord failed to initialize for enrollment")
                return null
            }

            val totalSamplesNeeded = (sampleRate * (durationMs / 1000.0)).toInt()
            val shortBuffer = ShortArray(bufferSize / 2)
            val recordedFloats = ArrayList<Float>(totalSamplesNeeded)

            record.startRecording()
            val startTs = System.currentTimeMillis()
            while (recordedFloats.size < totalSamplesNeeded && (System.currentTimeMillis() - startTs) < (durationMs + 1000L)) {
                val read = record.read(shortBuffer, 0, minOf(shortBuffer.size, totalSamplesNeeded - recordedFloats.size))
                if (read > 0) {
                    for (i in 0 until read) {
                        recordedFloats.add(shortBuffer[i] / 32768.0f)
                    }
                }
            }
            record.stop()
            record.release()
            return recordedFloats.toFloatArray()
        } catch (e: Exception) {
            Log.e(TAG, "Error recording direct audio for enrollment", e)
            try { record?.release() } catch (_: Exception) {}
            return null
        }
    }

    /**
     * Extract normalized 96-dimensional acoustic embedding vector from 16kHz audio samples.
     * Returns null if audio is too short or invalid.
     */
    fun extractEmbedding(context: Context, audioSamples: FloatArray): FloatArray? {
        if (audioSamples.size < 1600) { // Require at least 100ms of audio
            Log.w(TAG, "Audio too short for voice embedding: ${audioSamples.size} samples")
            return null
        }

        return try {
            val melSpectrogram = MelSpectrogram(context.assets)
            val embeddingModel = EmbeddingModel(context.assets)

            val spec = melSpectrogram.computeMelSpectrogram(audioSamples)
            if (spec.size < WINDOW_SIZE) {
                melSpectrogram.close()
                embeddingModel.close()
                Log.w(TAG, "Mel-spectrogram too short (${spec.size} frames < $WINDOW_SIZE)")
                return null
            }

            val windows = mutableListOf<Array<FloatArray>>()
            for (i in 0..spec.size - WINDOW_SIZE step STEP_SIZE) {
                val window = spec.sliceArray(i until i + WINDOW_SIZE)
                if (window.size == WINDOW_SIZE) {
                    windows.add(window)
                }
            }

            if (windows.isEmpty()) {
                melSpectrogram.close()
                embeddingModel.close()
                return null
            }

            val batch = Array(windows.size) { i ->
                Array(WINDOW_SIZE) { j ->
                    Array(spec[0].size) { k ->
                        FloatArray(1) { windows[i][j][k] }
                    }
                }
            }

            val frameEmbeddings = embeddingModel.generateEmbeddings(batch)
            melSpectrogram.close()
            embeddingModel.close()

            if (frameEmbeddings.isEmpty()) return null

            // Compute centroid (mean vector across temporal frames)
            val centroid = FloatArray(EMBEDDING_DIM)
            for (frame in frameEmbeddings) {
                for (dim in 0 until EMBEDDING_DIM) {
                    centroid[dim] += frame[dim]
                }
            }
            for (dim in 0 until EMBEDDING_DIM) {
                centroid[dim] /= frameEmbeddings.size.toFloat()
            }

            // Normalize to unit L2 norm
            normalizeL2(centroid)
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting voice embedding", e)
            null
        }
    }

    /**
     * Save an averaged reference voiceprint to local storage.
     */
    fun saveVoiceprint(context: Context, referenceVector: FloatArray, samplesCount: Int = 3) {
        val normalized = normalizeL2(referenceVector.copyOf())
        val serialized = normalized.joinToString(",") { it.toString() }
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putString(KEY_VOICEPRINT, serialized)
            .putBoolean(KEY_ENROLLED, true)
            .putInt(KEY_ENROLLMENT_COUNT, samplesCount)
            .apply()
        Log.i(TAG, "✅ Voiceprint enrolled and saved successfully ($samplesCount samples averaged, 96-d unit vector)")
    }

    /**
     * Retrieve the stored reference voiceprint.
     */
    fun getEnrolledVoiceprint(context: Context): FloatArray? {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY_VOICEPRINT, null) ?: return null
        return try {
            val parts = raw.split(",").map { it.toFloat() }
            if (parts.size == EMBEDDING_DIM) parts.toFloatArray() else null
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Reset / delete enrolled voiceprint.
     */
    fun clearVoiceprint(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .remove(KEY_VOICEPRINT)
            .putBoolean(KEY_ENROLLED, false)
            .remove(KEY_ENROLLMENT_COUNT)
            .apply()
        Log.i(TAG, "Enrolled voiceprint deleted")
    }

    /**
     * Verify an audio sample against the enrolled voiceprint.
     */
    fun verifySpeaker(context: Context, audioSamples: FloatArray): VerificationResult {
        val threshold = getThreshold(context)

        if (!isEnrolled(context)) {
            Log.w(TAG, "Voice ID verification requested but no voiceprint is enrolled")
            return VerificationResult(
                isVerified = false,
                similarity = 0.0f,
                threshold = threshold,
                reason = "NOT_ENROLLED"
            )
        }

        val refVector = getEnrolledVoiceprint(context)
        if (refVector == null) {
            return VerificationResult(
                isVerified = false,
                similarity = 0.0f,
                threshold = threshold,
                reason = "CORRUPTED_ENROLLMENT"
            )
        }

        val sampleEmbedding = extractEmbedding(context, audioSamples)
        if (sampleEmbedding == null) {
            Log.w(TAG, "Could not extract embedding from sample audio (too short or noisy)")
            return VerificationResult(
                isVerified = false,
                similarity = 0.0f,
                threshold = threshold,
                reason = "INSUFFICIENT_AUDIO"
            )
        }

        // Calculate Cosine Similarity: dot product of two L2-normalized unit vectors
        var similarity = 0.0f
        for (i in 0 until EMBEDDING_DIM) {
            similarity += refVector[i] * sampleEmbedding[i]
        }

        // Clamp between -1.0 and 1.0
        val clampedSim = similarity.coerceIn(-1.0f, 1.0f)
        val isVerified = clampedSim >= threshold

        Log.i(TAG, "👤 [Voice ID] Speaker verification: similarity=${String.format("%.4f", clampedSim)} (threshold=$threshold) => verified=$isVerified")

        return VerificationResult(
            isVerified = isVerified,
            similarity = clampedSim,
            threshold = threshold,
            reason = if (isVerified) "VERIFIED" else "VOICEPRINT_MISMATCH"
        )
    }

    private fun normalizeL2(vector: FloatArray): FloatArray {
        var sumSquares = 0.0f
        for (v in vector) {
            sumSquares += v * v
        }
        val norm = sqrt(sumSquares.toDouble()).toFloat()
        if (norm > 1e-6f) {
            for (i in vector.indices) {
                vector[i] /= norm
            }
        }
        return vector
    }
}
