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
        private val EN_GB_LOCALE = Locale("en", "GB")
        private val EN_US_LOCALE = Locale("en", "US")
        private val HI_IN_LOCALE = Locale("hi", "IN")

        const val PERSONA_STARK = "stark_uk"
        const val PERSONA_FRIDAY = "friday"
        const val PERSONA_INDIA = "india"
        const val PERSONA_US = "us"
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

    @Volatile
    var voicePersona: String = PERSONA_STARK
        private set

    /** Callback invoked whenever an utterance finishes speaking or errors out */
    var onSpeechDoneCallback: ((utteranceId: String) -> Unit)? = null

    init {
        try {
            val prefs = context.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE)
            voicePersona = prefs.getString("voice_persona", PERSONA_STARK) ?: PERSONA_STARK
        } catch (e: Exception) {
            Log.w(TAG, "Failed reading voice_persona from prefs", e)
        }

        try {
            tts = TextToSpeech(context.applicationContext, this)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to instantiate TextToSpeech", e)
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val engine = tts ?: return

            // Audio attributes: speech / assistant
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                val attrs = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANT)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
                engine.setAudioAttributes(attrs)
            }

            // Apply selected persona (accent, pitch, speech rate, voice)
            applyPersonaAndLocale(engine, hasDevanagari = false)

            isInitialized = true
            Log.i(TAG, "Native TextToSpeech initialized successfully (persona=$voicePersona)")

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
     * Apply accent, pitch, and voice profile based on selected persona.
     */
    private fun applyPersonaAndLocale(engine: TextToSpeech, hasDevanagari: Boolean) {
        if (hasDevanagari) {
            applyLocale(engine, HI_IN_LOCALE)
            engine.setPitch(1.0f)
            engine.setSpeechRate(1.0f)
            return
        }

        when (voicePersona) {
            PERSONA_STARK -> {
                // British English, deep pitch, formal pacing
                applyLocale(engine, EN_GB_LOCALE)
                engine.setPitch(0.88f)
                engine.setSpeechRate(1.02f)
                trySelectVoice(engine, EN_GB_LOCALE, isMale = true)
            }
            PERSONA_FRIDAY -> {
                // Female AI tone, higher pitch, snappy pacing
                applyLocale(engine, EN_GB_LOCALE)
                engine.setPitch(1.20f)
                engine.setSpeechRate(1.08f)
                trySelectVoice(engine, EN_GB_LOCALE, isMale = false)
            }
            PERSONA_INDIA -> {
                // Indian English
                applyLocale(engine, EN_IN_LOCALE)
                engine.setPitch(1.00f)
                engine.setSpeechRate(1.05f)
            }
            PERSONA_US -> {
                // US English
                applyLocale(engine, EN_US_LOCALE)
                engine.setPitch(0.95f)
                engine.setSpeechRate(1.05f)
            }
            else -> {
                applyLocale(engine, EN_GB_LOCALE)
                engine.setPitch(0.88f)
                engine.setSpeechRate(1.02f)
            }
        }
    }

    private fun trySelectVoice(engine: TextToSpeech, targetLocale: Locale, isMale: Boolean) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                val voices = engine.voices ?: return
                val targetLang = targetLocale.language
                val targetCountry = targetLocale.country

                val candidate = voices.firstOrNull { voice ->
                    val matchesLocale = voice.locale.language == targetLang &&
                            (targetCountry.isEmpty() || voice.locale.country == targetCountry)
                    if (!matchesLocale) return@firstOrNull false

                    val nameLower = voice.name.lowercase(Locale.ROOT)
                    if (isMale) {
                        nameLower.contains("male") || nameLower.contains("en-gb-x-rjs") || nameLower.contains("gb-b") || nameLower.contains("gb-d")
                    } else {
                        nameLower.contains("female") || nameLower.contains("en-gb-x-gba") || nameLower.contains("gb-a") || nameLower.contains("gb-c")
                    }
                } ?: voices.firstOrNull {
                    it.locale.language == targetLang && (targetCountry.isEmpty() || it.locale.country == targetCountry)
                }

                if (candidate != null) {
                    engine.voice = candidate
                    Log.d(TAG, "Selected TTS voice: ${candidate.name} for persona=$voicePersona")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed selecting specific TTS voice", e)
            }
        }
    }

    fun setVoicePersona(persona: String) {
        voicePersona = persona
        try {
            val prefs = context.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE)
            prefs.edit().putString("voice_persona", persona).apply()
        } catch (e: Exception) {
            Log.w(TAG, "Failed to persist voice_persona", e)
        }
        val engine = tts ?: return
        if (isInitialized) {
            applyPersonaAndLocale(engine, hasDevanagari = false)
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

    private val pendingUtterances = java.util.concurrent.ConcurrentHashMap<String, (() -> Unit)?>()
    private val activeUtteranceCount = java.util.concurrent.atomic.AtomicInteger(0)

    /**
     * Speak text aloud using the device TTS engine.
     * Respects voiceRepliesEnabled and beepOnly settings.
     */
    fun speak(text: String, onDone: (() -> Unit)? = null) {
        speakChunk(text, queueAdd = false, onDone = onDone)
    }

    /**
     * Speak a stream chunk aloud.
     * If queueAdd is true, appends to the current speech queue without dropping audio focus.
     * If queueAdd is false, flushes any ongoing speech and starts fresh.
     */
    fun speakChunk(text: String, queueAdd: Boolean, onDone: (() -> Unit)? = null) {
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
        applyPersonaAndLocale(engine, hasDevanagari)

        val utteranceId = UUID.randomUUID().toString()

        if (!queueAdd) {
            try {
                engine.stop()
            } catch (e: Exception) {}
            pendingUtterances.clear()
            activeUtteranceCount.set(0)
        }

        activeUtteranceCount.incrementAndGet()
        pendingUtterances[utteranceId] = onDone

        engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) {
                isSpeaking = true
                requestTransientFocus()
            }

            override fun onDone(id: String?) {
                val cb = id?.let { pendingUtterances.remove(it) }
                cb?.invoke()
                val remaining = activeUtteranceCount.decrementAndGet()
                if (remaining <= 0) {
                    activeUtteranceCount.set(0)
                    isSpeaking = false
                    abandonTransientFocus()
                    onSpeechDoneCallback?.invoke(id ?: "")
                }
            }

            override fun onError(id: String?) {
                val cb = id?.let { pendingUtterances.remove(it) }
                cb?.invoke()
                val remaining = activeUtteranceCount.decrementAndGet()
                if (remaining <= 0) {
                    activeUtteranceCount.set(0)
                    isSpeaking = false
                    abandonTransientFocus()
                    onSpeechDoneCallback?.invoke(id ?: "")
                }
            }
        })

        val queueMode = if (queueAdd) TextToSpeech.QUEUE_ADD else TextToSpeech.QUEUE_FLUSH

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            val params = Bundle().apply {
                putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f)
            }
            engine.speak(trimmed, queueMode, params, utteranceId)
        } else {
            @Suppress("DEPRECATION")
            val params = HashMap<String, String>().apply {
                put(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, utteranceId)
            }
            @Suppress("DEPRECATION")
            engine.speak(trimmed, queueMode, params)
        }
    }

    /**
     * Immediately cancel active speech and restore music volume.
     */
    fun stop() {
        try {
            pendingUtterances.clear()
            activeUtteranceCount.set(0)
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
