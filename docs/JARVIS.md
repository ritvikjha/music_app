# Jarvis On-Device Voice Assistant — Architecture & Developer Guide

Jam features **Jarvis**, an on-device, hands-free voice assistant engineered for continuous wake-word detection, local speech transcription, and instant music and device control.

---

## 1. System Architecture

Jarvis operates on a **five-stage pipeline** designed for speed, privacy, and battery efficiency:

```text
[Continuous Audio (16kHz)]
         │
         ▼
┌─────────────────────────────────┐
│ Stage 1: Wake-Word Engine       │  openWakeWord ONNX Runtime (Hey Jarvis / Hello Jarvis)
│ (Native Kotlin Service)         │  • Runs in persistent foreground service (START_STICKY)
└────────────────┬────────────────┘  • Audio buffer discarded every 80ms; zero cloud recording
                 │ Wake detected (score > threshold)
                 ▼
┌─────────────────────────────────┐
│ Stage 2: Command Capture & STT  │  android.speech.SpeechRecognizer
│ (Native Kotlin Service)         │  • Offline-first recognition (en-IN / hi-IN)
└────────────────┬────────────────┘  • Audio focus ducking + earcon beep
                 │ Final transcript string
                 ▼
┌─────────────────────────────────┐
│ Fast Path: Native Device Action │  Executes in Kotlin (<50ms): Flashlight, Volume,
│ (CommandRegistry.kt)            │  Alarms, Timers, App Launching, Phone Calls
└────────────────┬────────────────┘
                 │ If not a native command -> Forward to React Native JS Bridge
                 ▼
┌─────────────────────────────────┐
│ Stage 3: Two-Tier Intent Router │  Tier 1: Instant local regex & token parser (<5ms)
│ (src/jarvis/brain/router.ts)    │  Tier 2: Private proxy fallback (Gemini LLM)
└────────────────┬────────────────┘
                 │ Structured Intent JSON
                 ▼
┌─────────────────────────────────┐
│ Stage 4: Music Action Executor  │  Reuses existing React Contexts & player services
│ (src/jarvis/actions/executor.ts)│  • Resolves JioSaavn songs, queues, playlists, rooms
└────────────────┬────────────────┘
                 │ Execution result + spoken reply
                 ▼
┌─────────────────────────────────┐
│ Stage 5: Voice Reply & TTS      │  Native Android TextToSpeech
│ (JarvisTtsHelper.kt)            │  • Transient ducking; 5s follow-up window for dialogs
└─────────────────────────────────┘
```

---

## 2. File Map

| Directory / File | Description |
| --- | --- |
| **Native Module & Service** | |
| `modules/jarvis-wake-word/` | Expo Module bridging native Kotlin to React Native JS |
| `.../JarvisListenerService.kt` | Foreground service, state machine, audio capture, call & mic conflict listeners |
| `.../JarvisWakeWordModule.kt` | Native bridge methods (`startListening`, `stopListening`, `speak`, `setSensitivity`) |
| `.../BootReceiver.kt` | Android 14/15 compliant `BOOT_COMPLETED` receiver (heads-up tap notification) |
| `.../BatteryOptimizationHelper.kt` | Doze mode exemptions and multi-OEM autostart intent launcher |
| `.../JarvisTtsHelper.kt` | Android TextToSpeech wrapper with locale fallback and audio focus ducking |
| `.../CommandRegistry.kt` | Native Kotlin device control parser & dispatcher (<50ms execution) |
| `.../handlers/` | Handlers for Flashlight, Volume, Alarms, Timers, Apps, and Phone calls |
| `.../assets/` | ONNX models: `hey_jarvis.onnx`, `hello_jarvis.onnx`, `melspectrogram.onnx`, `embedding_model.onnx` |
| **Brain & Router (JS)** | |
| `src/jarvis/brain/router.ts` | Two-tier intent router (local first, LLM proxy fallback) |
| `src/jarvis/brain/localIntents.ts` | Instant regex/token parsing rules for 20+ music & playback intents |
| `src/jarvis/brain/normalize.ts` | Hinglish normalization, numeral conversion, soundalike corrections |
| `src/jarvis/brain/llmClient.ts` | Private proxy client to `POST /jarvis/brain` with offline failure handling |
| `src/jarvis/brain/replies.ts` | Natural, crisp voice response templates (<12 words) with variants |
| `src/jarvis/brain/types.ts` | Intent and slot schemas, confidence scores, and action contracts |
| **Action Execution (JS)** | |
| `src/jarvis/actions/executor.ts` | Executes resolved intents against player, queue, library, and Jam rooms |
| `src/jarvis/actions/songResolver.ts` | Resolves JioSaavn search matches and handles title disambiguation |
| `src/jarvis/actions/registry.ts` | Module-level registry exposing live React context handlers |
| `src/jarvis/JarvisBridge.tsx` | Headless component registered in `_layout.tsx` syncing React state |
| `src/jarvis/JarvisService.ts` | High-level JS API coordinating listeners, preferences, and lifecycle |
| `src/jarvis/eventLogger.ts` | In-memory 100-event ring buffer tracking state, wake hits, and errors |
| **UI Components** | |
| `src/jarvis/ui/JarvisOnboardingModal.tsx` | 5-step first-run onboarding wizard with OEM autostart guides |
| `src/jarvis/ui/JarvisStatusRow.tsx` | Real-time health badge (`Listening`, `Paused`, `Battery-optimized`, etc.) |
| `src/jarvis/ui/JarvisSettingsSection.tsx` | Settings for Sensitivity, Wake Phrase, Voice Replies, and Charging-only |
| `src/jarvis/ui/JarvisPrivacyModal.tsx` | Transparent disclosure explaining 100% on-device wake-word architecture |
| `src/components/JarvisDebugModal.tsx` | Hidden debug tester, 77-utterance benchmark suite, and ring-buffer logs |

---

## 3. How to Customize Jarvis

### A. How to Change or Add Spoken Replies

All spoken responses are defined in `src/jarvis/brain/replies.ts`.

To add or change a response:

```typescript
export const REPLIES = {
  // Existing:
  PLAY_SONG: [
    (title: string, artist?: string) =>
      artist ? `Playing ${title} by ${artist}` : `Playing ${title}`,
    (title: string) => `Here is ${title}`,
  ],
  // Add new variant:
  CUSTOM_CONFIRMATION: [
    'Right on it.',
    'Consider it done.',
    'Sure thing!',
  ],
};
```

Use `pickVariant(REPLIES.CUSTOM_CONFIRMATION)` in `executor.ts` to ensure natural variety.

### B. How to Add a New Voice Command End-to-End

Suppose you want to add a `"SLEEP_IN_MINUTES"` or `"SURPRISE_ME"` command:

1. **Define Intent in `src/jarvis/brain/types.ts`**:
   Add to `IntentName` union:

   ```typescript
   export type IntentName =
     | ...
     | 'SURPRISE_ME';
   ```

2. **Add Local Matcher in `src/jarvis/brain/localIntents.ts`**:
   Add rule to `LOCAL_INTENT_RULES`:

   ```typescript
   {
     intent: 'SURPRISE_ME',
     patterns: [
       /^surprise\s+me$/i,
       /^(play\s+something\s+random|kuch\s+bhi\s+baja\s*do)$/i,
     ],
     handler: () => ({
       intent: 'SURPRISE_ME',
       slots: {},
       confidence: 0.95,
       spokenReply: 'Shuffling a surprise mix for you.',
       source: 'local',
     }),
   }
   ```

3. **Handle Action in `src/jarvis/actions/executor.ts`**:
   Inside `executeLiveIntent`:

   ```typescript
   case 'SURPRISE_ME': {
     const trending = await getTrendingTracks();
     const random = trending[Math.floor(Math.random() * trending.length)];
     handlers.playNow(random);
     return {
       ok: true,
       spokenReply: `Playing ${random.title}`,
       toast: { message: `Surprise: ${random.title}`, type: 'success' },
     };
   }
   ```

4. **Add Fast Path in Native Kotlin (Optional for Device Actions)**:
   If the command controls the Android device (e.g. toggles Bluetooth or opens an app), add a handler in `modules/jarvis-wake-word/android/src/main/java/com/ritvik/jammusic/jarvis/handlers/` and register it in `CommandRegistry.kt`.

---

## 4. How to Train a Custom Wake Word ("Hello Jarvis")

To generate a custom `.onnx` model using openWakeWord's free automated pipeline:

### Step-by-Step Training Guide via Google Colab

1. Open the official openWakeWord automated training notebook in your browser:
   [openWakeWord Training Notebook on Google Colab](https://colab.research.google.com/github/dscripka/openWakeWord/blob/main/notebooks/automatic_model_training.ipynb)
2. In Colab, select **Runtime → Change runtime type** and ensure **T4 GPU** is selected (free tier).
3. In **Step 1: Configuration**:
   - Set `target_phrase = ["hello jarvis"]`
   - Set `model_name = "hello_jarvis"`
   - Leave `n_samples = 25000` (synthetic TTS generation will generate diverse phonetic variations automatically using Piper TTS).
4. Run all cells sequentially. The pipeline will:
   - Generate synthetic audio clips for "hello jarvis" across 20+ voices and pitch variations.
   - Mix background noise from the AudioSet and Free Music Archive datasets.
   - Train an acoustic classifier on top of openWakeWord's 16kHz audio embeddings.
   - Export the quantized model to `hello_jarvis.onnx`.
5. In the file explorer sidebar on the left, locate and download `hello_jarvis.onnx`.

### Improving Accuracy with Real Voice Samples & Hard Negatives

If the synthetic model produces false positives or misses your voice:

1. **Real voice recordings**: Record 5-10 WAV clips saying "Hello Jarvis" in your normal voice, quiet room, and with music playing. Place them in the `custom_recordings/` folder in the Colab workspace before running the training cell.
2. **Hard negatives**: If words like "Hello there" or "Jar" falsely trigger the model, add them to `negative_phrases = ["hello there", "jar of hearts", "hey service"]`.
3. **Drop into Jam**:
   Copy the downloaded `hello_jarvis.onnx` into:
   - `modules/jarvis-wake-word/android/src/main/assets/hello_jarvis.onnx`
   - `android/app/src/main/assets/hello_jarvis.onnx`
4. In Jam: Go to **Profile → Jarvis Settings → Wake Phrase** and select **"Hello Jarvis"**.

---

## 5. Known Android OS Limitations & Resilience

| Limitation | Impact | Jam's Built-in Mitigation |
| --- | --- | --- |
| **Android 15 Foreground Service Restrictions** | Background broadcast receivers cannot launch microphone foreground services (`ForegroundServiceStartNotAllowedException`). | `BootReceiver` posts a high-priority "Tap to re-enable Jarvis" notification. User tap opens the app and starts the service legally. |
| **OEM Background Aggression (Xiaomi, Samsung, ColorOS)** | Swiping app away from recent apps kills child threads and ignores `START_STICKY`. | Onboarding step 4 automatically detects phone manufacturer and deep-links to OEM "Autostart" and "No restrictions" battery settings. |
| **Phone Call Mic Exclusive Access** | Android Telephony modem seizes microphone hardware during incoming/outgoing calls. | `TelephonyCallback` automatically sets state to `PAUSED_MIC_IN_USE` and resumes listening 1500ms after the call ends. |
| **Concurrent Mic Apps (Voice Notes, Video Recording)** | Kernel audio driver rejects concurrent `AudioRecord` sessions. | `AudioManager.AudioRecordingCallback` detects conflict, pauses Jarvis, and auto-resumes with backoff once released. |
| **Bluetooth Headset Latency** | Some older Bluetooth SCO headsets introduce 100-300ms audio buffering latency. | Wake-word engine processes 80ms chunks; audio focus transient may-duck prevents headset clipping. |

---

## 6. Hands-Free WhatsApp Auto-Send (Android Accessibility Service)

Jarvis features 100% hands-free WhatsApp messaging:

1. Spoken command: *"WhatsApp `[contact]` `[message]`"* (or *"Papa ko WhatsApp karo main aa raha hu"*).
2. Native layer resolves contact phone number from Android contacts and formats it for WhatsApp API.
3. If user has enabled **Hands-Free WhatsApp Auto-Send** in Profile settings, the native layer arms `JarvisAccessibilityService.triggerAutoSend(contact)` with a 5-second safety timeout.
4. WhatsApp is launched directly into the contact chat with the pre-filled message text.
5. `JarvisAccessibilityService.onAccessibilityEvent()` detects `com.whatsapp`, searches for the Send button node (`com.whatsapp:id/send` or "Send" / "भेजें"), and performs `AccessibilityNodeInfo.ACTION_CLICK`.
6. Once dispatched, it triggers `performGlobalAction(GLOBAL_ACTION_BACK)` returning the user back to Jam (or their previous app) and confirms via TTS: *"Message sent to `[Contact]`, sir."*

---

## 7. Stark Level 2.0 Ambient Intelligence & Macro Automation

Jarvis integrates dynamic environmental awareness and Tony Stark butler-style persona intelligence:

### A. Proactive Ambient Event Triggers (Context without Asking)

Broadcast listeners registered in `JarvisListenerService.kt` detect hardware state changes and trigger proactive, subtle voice notifications:

- **Headset / Bluetooth Connected (`ACTION_HEADSET_PLUG` / `ACTION_ACL_CONNECTED`)**:
  Plays prompt earcon and whispers: *"Audio link established, sir. Shall I resume your queue?"* (12s debounce).
- **Power Connected (`ACTION_POWER_CONNECTED`)**:
  Alerts: *"Power levels rising, charging initialized at maximum throughput."*
- **Power Disconnected (`ACTION_POWER_DISCONNECTED`)**:
  Alerts: *"Power disconnected. We are running on internal battery reserves, sir."*
- **Battery Critical (<15% `ACTION_BATTERY_LOW`)**:
  Alerts: *"Warning: main power is down to {level} percent. I recommend connecting to a power cell."* (10 min debounce).

### B. Situational "Status Report" & Telemetry

- **Commands**: *"Status report"*, *"Diagnostics"*, *"All systems check"*, *"Kya haal hai"*, *"System status"*.
- **Telemetry Gathered On-Device (0 Network)**:
  - Battery charge percentage & battery temperature in Celsius (thermals classified as optimal / nominal / elevated).
  - Active network connectivity (Wi-Fi, high-speed cellular, or local/offline protocols).
  - Storage telemetry via `StatFs` (free storage in GB).
- **Spoken Diagnostics**: *"All systems nominal, sir. Power is at 82 percent, thermal readings optimal at 31.4 degrees Celsius. Connected to high-speed Wi-Fi network. Free storage at 45.2 gigabytes. Music playback ready."*

### C. Conversational Short-Term Memory & Anaphora Resolution

- Keeps a 3-turn rolling buffer in `src/jarvis/brain/router.ts`.
- Automatically resolves pronouns across turns before rule parsing:
  - *"Play more from him/her"* / *"Uske aur gaane chalao"* → Resolves to last played/requested artist.
  - *"WhatsApp him/her `[message]`"* / *"Use message karo `[message]`"* → Resolves to last contacted person.
  - *"Open it"* / *"Use kholo"* → Resolves to last launched app.
  - *"Like it"* / *"Pause it"* / *"Isko like karo"* → Resolves to active song controls.

### D. "Warp Speed" Multi-Command Chaining (<50ms Execution)

- Conjunction splitter in `CommandRegistry.kt` splits utterances across English and Hinglish conjunctions: `and`, `then`, `aur`, `phir`, `fir`, `ke baad`.
- Example: *"Turn on flashlight and set volume to 40 percent and open YouTube"*
  - Executes `FLASHLIGHT_ON` + `SET_VOLUME(40)` + `OPEN_APP("YouTube")` sequentially in under 50ms.
  - Combines individual confirmations into a single smooth spoken response: *"Flashlight turned on. Volume set to 40 percent. Opening YouTube, sir."*

### E. "Stark Protocols" Macro Automation

- **Night Protocol** (*"Protocol Night"*, *"Good night"*, *"Night mode"*, *"So jao"*):
  Turns off flashlight, drops system volume to 10%, pauses music, and confirms: *"Rest well, sir. Monitoring systems in background."*
- **House Party Protocol** (*"House party protocol"*, *"Party mode"*, *"Party shuru karo"*):
  Raises system volume to 85%, turns on torch/flashlight, queues trending party hits, enables shuffle, and announces: *"Party protocol engaged. Turning up the decibels."*
- **Stealth Mode Protocol** (*"Stealth mode"*, *"Silent protocol"*, *"Chup raho"*):
  Instantly mutes all audio, sets TTS replies to silent / beep-only mode, and confirms: *"Stealth mode engaged. Audio muted."*
