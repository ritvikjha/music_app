package xyz.rementia.openwakeword.audio

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import androidx.core.content.ContextCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.isActive
import kotlin.coroutines.coroutineContext

/**
 * Handles audio recording from device microphone.
 * Emits audio buffers as a Flow for processing.
 * Vendored from Re-MENTIA/openwakeword-android-kt (Apache 2.0 License).
 */
internal class AudioRecorder(
    private val context: Context
) {

    companion object {
        const val SAMPLE_RATE = 16000
        const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        const val BUFFER_SIZE_IN_SHORTS = 1280
    }

    fun hasRecordPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    @Volatile
    var currentAudioSessionId: Int = 0
        private set

    @SuppressLint("MissingPermission")
    fun startRecording(): Flow<FloatArray> = flow {
        require(hasRecordPermission()) { "RECORD_AUDIO permission not granted" }

        val minBufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        val bufferSize = maxOf(minBufferSize, BUFFER_SIZE_IN_SHORTS * 2)

        var audioRecord: AudioRecord? = null
        var attempts = 0
        while (attempts < 5 && coroutineContext.isActive) {
            val record = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize
            )
            if (record.state == AudioRecord.STATE_INITIALIZED) {
                audioRecord = record
                break
            }
            record.release()
            attempts++
            android.util.Log.w("AudioRecorder", "AudioRecord not initialized (attempt $attempts/5). Waiting 200ms for hardware mic release...")
            kotlinx.coroutines.delay(200L)
        }

        val initializedRecord = audioRecord ?: throw IllegalStateException("Failed to initialize AudioRecord after 5 attempts")

        currentAudioSessionId = initializedRecord.audioSessionId

        val audioBuffer = ShortArray(BUFFER_SIZE_IN_SHORTS)

        try {
            initializedRecord.startRecording()

            while (coroutineContext.isActive) {
                val readCount = initializedRecord.read(audioBuffer, 0, audioBuffer.size)

                if (readCount > 0) {
                    val floatBuffer = FloatArray(readCount) { i ->
                        audioBuffer[i] / 32768.0f
                    }
                    emit(floatBuffer)
                }
            }
        } finally {
            currentAudioSessionId = 0
            if (initializedRecord.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                initializedRecord.stop()
            }
            initializedRecord.release()
        }
    }.flowOn(Dispatchers.IO)
}
