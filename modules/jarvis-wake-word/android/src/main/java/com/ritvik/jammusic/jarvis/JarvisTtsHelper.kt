package com.ritvik.jammusic.jarvis

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import java.util.Locale
import java.util.UUID

/**
 * JarvisTtsHelper — Lightweight native Text-To-Speech engine.
 *
 * Capabilities:
 *   - Built-in Android TextToSpeech running in native service (operates even when JS is dead).
 *   - Automatic language switching: default "en-IN", automatically detects Hindi/Devanagari
 *     to switch to "hi-IN".
 *   - Voice pack availability detection with helpful fallback guidance.
 *   - Audio focus handling: requests transient may-duck focus during speech, restoring
 *     music playback volume smoothly upon completion.
 *   - Supports "Voice replies" On/Off and "Beep only" modes.
 *   - Exposes speak(), stop(), and onSpeechDone callbacks.
 */
class JarvisTtsHelper(private val context: Context) : TextToSpeech.OnInitListener {

    companion object {
        private const val TAG = "JarvisTTS"
        private val EN_IN_LOCALE = Locale("en", "IN")
        private val HI_IN_LOCALE = Locale("hi", "IN")
    }

    private var tts: TextToSpeech? = null
    private var isInitialized = false
    private val pendingSpeechQueue = mutableListOf<Pair<String, (() -> Unit)?>>()

    // Audio focus tracking
    private var focusRequest: AudioFocusRequest? = null
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

    // State & Settings
    @Volatile
    var isSpeaking: Boolean = false
        private set

    @Volatile
    var voiceRepliesEnabled: Boolean = true

    @Volatile
    var beepOnly: Boolean = false

    /** Callback invoked whenever an utterance finishes speaking or errors out */
    var onSpeechDoneCallback: ((utteranceId: String) -> Unit)? = null

    init {
        try {
            tts = TextToSpeech(context.applicationContext, this)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to instantiate TextToSpeech", e)
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val engine = tts ?: return

            // Default to Indian English en-IN
            applyLocale(engine, EN_IN_LOCALE)

            // Audio attributes: speech / assistant
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                val attrs = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANT)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
                engine.setAudioAttributes(attrs)
            }

            engine.setPitch(1.0f)
            engine.setSpeechRate(1.05f) // Natural, crisp pacing

            isInitialized = true
            Log.i(TAG, "Native TextToSpeech initialized successfully (default en-IN)")

            // Flush pending utterances
            synchronized(pendingSpeechQueue) {
                for ((text, callback) in pendingSpeechQueue) {
                    speak(text, callback)
                }
                pendingSpeechQueue.clear()
            }
        } else {
            Log.w(TAG, "TextToSpeech init failed with status: $status")
        }
    }

    /**
     * Set target locale on the TTS engine with missing-data validation and fallback.
     */
    private fun applyLocale(engine: TextToSpeech, targetLocale: Locale) {
        try {
            val result = engine.setLanguage(targetLocale)
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                Log.w(
                    TAG,
                    "⚠️ TTS voice pack missing or not supported for ${targetLocale.displayName} (${targetLocale.language}-${targetLocale.country}). " +
                    "To enable high quality voices, install speech data via Android Settings -> System -> Languages -> Text-to-speech. " +
                    "Falling back to US English."
                )
                engine.setLanguage(Locale.US)
            } else {
                Log.d(TAG, "TTS locale set to ${targetLocale.displayName}")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error applying TTS locale $targetLocale", e)
        }
    }

    /**
     * Request transient may-duck audio focus so background music ducks while speaking.
     */
    private fun requestTransientFocus() {
        val manager = audioManager ?: return
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ASSISTANT)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build()
                    )
                    .setAcceptsDelayedFocusGain(false)
                    .build()
                focusRequest = req
                val res = manager.requestAudioFocus(req)
                Log.d(TAG, "TTS requested transient audio focus (result=$res)")
            } else {
                @Suppress("DEPRECATION")
                val res = manager.requestAudioFocus(
                    null,
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
                )
                Log.d(TAG, "TTS requested legacy transient audio focus (result=$res)")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to request audio focus for TTS", e)
        }
    }

    /**
     * Abandon transient audio focus to restore music volume immediately.
     */
    private fun abandonTransientFocus() {
        val manager = audioManager ?: return
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                focusRequest?.let { manager.abandonAudioFocusRequest(it) }
                focusRequest = null
            } else {
                @Suppress("DEPRECATION")
                manager.abandonAudioFocus(null)
            }
            Log.d(TAG, "TTS abandoned transient audio focus — music volume restored")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to abandon audio focus for TTS", e)
        }
    }

    /**
     * Play an earcon beep when in "Beep only" mode.
     */
    private fun playBeepTone() {
        try {
            val toneGen = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80)
            toneGen.startTone(ToneGenerator.TONE_PROP_ACK, 120)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to play beep tone", e)
        }
    }

    /**
     * Speak text aloud using the device TTS engine.
     * Respects voiceRepliesEnabled and beepOnly settings.
     */
    fun speak(text: String, onDone: (() -> Unit)? = null) {
        val trimmed = text.trim()
        if (trimmed.isBlank()) {
            onDone?.invoke()
            onSpeechDoneCallback?.invoke("empty")
            return
        }

        // If Beep Only mode is active: play beep, skip TTS speech
        if (beepOnly) {
            Log.i(TAG, "Beep-only mode active — skipping speech synthesis, playing beep")
            playBeepTone()
            onDone?.invoke()
            onSpeechDoneCallback?.invoke("beep_only")
            return
        }

        // If Voice replies are disabled: skip completely
        if (!voiceRepliesEnabled) {
            Log.i(TAG, "Voice replies disabled in settings — skipping speech synthesis")
            onDone?.invoke()
            onSpeechDoneCallback?.invoke("voice_disabled")
            return
        }

        // Queue speech if engine is still initializing
        if (!isInitialized) {
            synchronized(pendingSpeechQueue) {
                pendingSpeechQueue.add(Pair(trimmed, onDone))
            }
            return
        }

        val engine = tts ?: run {
            onDone?.invoke()
            onSpeechDoneCallback?.invoke("no_engine")
            return
        }

        // Detect Hindi / Devanagari characters: Unicode range U+0900 to U+097F
        val hasDevanagari = trimmed.any { it in '\u0900'..'\u097F' }
        val targetLocale = if (hasDevanagari) HI_IN_LOCALE else EN_IN_LOCALE
        applyLocale(engine, targetLocale)

        val utteranceId = UUID.randomUUID().toString()

        engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) {
                isSpeaking = true
                requestTransientFocus()
            }

            override fun onDone(id: String?) {
                if (id == utteranceId) {
                    isSpeaking = false
                    abandonTransientFocus()
                    onDone?.invoke()
                    onSpeechDoneCallback?.invoke(utteranceId)
                }
            }

            override fun onError(id: String?) {
                if (id == utteranceId) {
                    isSpeaking = false
                    abandonTransientFocus()
                    onDone?.invoke()
                    onSpeechDoneCallback?.invoke(utteranceId)
                }
            }
        })

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            val params = Bundle().apply {
                putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f)
            }
            engine.speak(trimmed, TextToSpeech.QUEUE_FLUSH, params, utteranceId)
        } else {
            @Suppress("DEPRECATION")
            val params = HashMap<String, String>().apply {
                put(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, utteranceId)
            }
            @Suppress("DEPRECATION")
            engine.speak(trimmed, TextToSpeech.QUEUE_FLUSH, params)
        }
    }

    /**
     * Immediately cancel active speech and restore music volume.
     */
    fun stop() {
        try {
            tts?.stop()
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping TTS", e)
        } finally {
            if (isSpeaking) {
                isSpeaking = false
                abandonTransientFocus()
            }
        }
    }

    fun destroy() {
        try {
            stop()
            tts?.shutdown()
            tts = null
            isInitialized = false
        } catch (e: Exception) {
            Log.w(TAG, "Error shutting down TTS", e)
        }
    }
}
