# Copy-paste prompt: Jam Music — Phase 1 + Phase 2

Use everything below the line as a single prompt for Cursor / another coding agent.

---

## PROMPT START

You are implementing **Phase 1 and Phase 2** for **Jam Music**, an Expo SDK 57 + React Native app (expo-router) with JioSaavn streaming, local library, and Socket.io jam rooms.

### Stack and conventions

- **App entry:** `expo-router`, tabs in `src/app/(tabs)/`
- **Screens:** `src/screens/*.tsx` (often imported from thin route files)
- **State:** React contexts in `src/context/` (`PlayerContext`, `JamContext`, `LibraryContext`, `PlaylistContext`, `AuthContext`)
- **Audio:** `expo-audio` singleton in `src/services/audioPlayer.ts` (already uses `setActiveForLockScreen`, `formatAudioMetadata`, media control handlers)
- **Jam sync:** `src/services/playbackSyncManager.ts` → server `server/server.js` (Render/Fly)
- **Config today:** hardcoded in `src/config/index.ts` (`SYNC_SERVER_URL`, `SAAVN_API_URL`, resync/drift constants)
- **Deep links:** scheme `jam` in `app.json`; routes `src/app/room/[roomId].tsx`, `src/app/playlist/share.tsx`
- **Theme:** `src/theme/index.ts` — match existing “Deep Obsidian Luxe” styling
- **Rules:** Minimal diffs, no unrelated refactors, no new backend (Phase 3+), do not commit secrets. Add `expo-file-system` to `package.json` dependencies if missing (transitive use today).

### Definition of done (both phases)

- `npm run lint` passes (or fix new lint issues you introduce)
- Manual smoke: search → play → background/lock screen controls; join jam room; stash a track; open `jam://room/CODE` and playlist share link
- No duplicate logic in both `src/` and `src\` paths — edit canonical `src/` files only

---

## PHASE 1 — Quick wins (implement first)

### 1. Environment-based config

**Goal:** Stop hardcoding server/API URLs; support dev vs production via Expo public env.

**Tasks:**

1. Add `app.config.js` (or extend config) reading:
   - `EXPO_PUBLIC_SYNC_SERVER_URL` (default: current production URL from `src/config/index.ts`)
   - `EXPO_PUBLIC_SAAVN_API_URL` (default: `https://www.jiosaavn.com`)
   - Optional: `EXPO_PUBLIC_RESYNC_INTERVAL_MS`, `EXPO_PUBLIC_DRIFT_TOLERANCE_MS`
2. Expose values through `expo-constants` `Constants.expoConfig?.extra` (or `process.env.EXPO_PUBLIC_*` where appropriate).
3. Update `src/config/index.ts` to read from env/extra with safe fallbacks.
4. Add `.env.example` documenting variables (do not commit real secrets).
5. Document in a short comment at top of `src/config/index.ts` how to run locally with a custom sync server.

**Acceptance:** Changing `EXPO_PUBLIC_SYNC_SERVER_URL` and restarting Metro points the app at a different sync server without editing source.

---

### 2. Offline stash reliability + UX

**Goal:** Downloads work reliably and users see progress and stashed state.

**Files:** `src/services/offlineStorage.ts`, `src/components/SongCard.tsx`, `src/screens/LibraryScreen.tsx`, optionally `PlayerContext` / `audioPlayer.ts` for local URI playback (already supports `file://` in `formatArtworkUrl`).

**Tasks:**

1. Ensure `expo-file-system` is a direct dependency in root `package.json` (version aligned with Expo 57).
2. Extend `offlineStorage` with:
   - Download progress callback (use `FileSystem.createDownloadResumable` if not already)
   - Clear error messages (network, disk full, invalid URL)
   - `getStashedSongs()` / list for Library UI
3. UI:
   - On `SongCard` long-press menu or action: “Stash offline” / “Remove stash” with loading state
   - Badge or icon when track is stashed
   - Library section or filter: “Stashed” with total size (sum `fileSizeBytes` from index)
4. When playing, prefer stashed local URI if available (wire through existing player load path).

**Acceptance:** Stash a song, airplane mode, play from Library stashed section without crash.

---

### 3. Jam room UX — server parity

**Goal:** UI reflects all jam features the server already supports.

**Server events (reference `server/server.js`):** `queue-vote`, `host-state`, `muted-users-update`, `volume-weight-update`, `room-permissions`, `queue-state` (entries include `votes`, `upvoters`).

**Client (partially wired):** `playbackSyncManager.ts` has listeners and `emitQueueVote`; `JamContext` has host permissions toggles in `JamRoomScreen.tsx`. **QueueModal has no vote UI yet.**

**Tasks:**

1. **Queue upvotes:** In `QueueModal.tsx` (or jam queue list in `JamRoomScreen.tsx`), show vote count per entry; tap to upvote via `syncManager.emitQueueVote` / JamContext wrapper; reflect `upvoters` so user can’t double-vote; sort optional: by votes then FIFO.
2. **Muted users:** Surface `mutedUsers` from JamContext; host can mute via existing `emitDjOverride`; show muted badge in member list; disable or warn on chat/voice for muted self.
3. **Volume weight:** If host adjusts DJ volume weight, apply sensibly to client playback gain (document if server-only metaphor — at minimum show current weight in host panel).
4. **Guest permissions:** Ensure non-host sees disabled controls when `allowGuestQueue` / `allowGuestPlayback` false (partially done — verify play, add-to-queue, skip).
5. **Queue-state refresh:** After vote, confirm `queue-state` payload updates votes on all clients.

**Acceptance:** Two devices in same room; guest upvotes queue item; host toggles guest queue off; guest cannot add; counts sync.

---

### 4. Deep links end-to-end

**Goal:** Cold start deep links work reliably.

**Routes:**

- `jam://room/[roomId]` → `src/app/room/[roomId].tsx` (join + redirect to `/(tabs)/jam`)
- Playlist share → `src/app/playlist/share.tsx` (`data` query param JSON)

**Tasks:**

1. Verify `app.json` `scheme: "jam"` and expo-router linking config includes `room/[roomId]` and `playlist/share`.
2. Room invite: handle invalid room id, show error + button to Jam tab; don’t loop if `joinRoom` fails.
3. Playlist: handle malformed `data`, oversized payload, empty songs; toast on success/failure; optional “Open in app” share format docs in code comment.
4. Add share helpers on Jam screen (copy room link) and playlist share (if not already) using `expo-linking` URL builder consistent with routes.

**Acceptance:** Kill app → open `jam://room/TEST01` → lands in jam tab in room; share playlist link imports on second device/emulator.

---

### 5. Repo hygiene

**Goal:** Clean git state for day-to-day dev.

**Tasks:**

1. Confirm `dist/` is in `.gitignore` (already is) — if tracked, remove from index only (`git rm -r --cached dist/`); do not delete local build artifacts unless user asks.
2. Do not create parallel files under `src\` — only `src/`.
3. Optional: add `src.zip` to `.gitignore` if present untracked.

**Acceptance:** `git status` no longer lists `dist/` as untracked after cache clear; single `src/` tree for edits.

---

## PHASE 2 — Real music app feel (implement after Phase 1)

### 1. Background playback + system media controls

**Goal:** Music continues with screen off; lock screen / notification show title, artist, artwork; play/pause/skip work.

**Current state:** iOS `UIBackgroundModes: audio` in `app.json`; `audioPlayer.ts` already calls `setActiveForLockScreen` and `setAudioModeAsync`.

**Tasks:**

1. Audit `setAudioModeAsync` in `audioPlayer.ts` init: `playsInSilentMode`, `shouldPlayInBackground`, `interruptionMode` per expo-audio 57 docs.
2. Wire `PlayerContext` to `audioPlayer.setMediaControlHandlers` for play/pause/next/previous/seek so OS controls drive the same logic as in-app buttons.
3. **Android:** Add/config plugin if required for foreground service + media notification (expo-audio docs for SDK 57); test on physical device or emulator.
4. **Jam mode:** Document behavior when in jam room (host-driven sync vs local controls) — prefer not breaking sync; optional: disable skip for non-host when `allowGuestPlayback` false.
5. Regression: stash/local `file://` tracks still show artwork on lock screen.

**Acceptance:** Play song → lock phone → audio continues ≥2 min; notification controls pause/resume; skip goes to next queue item.

---

### 2. Artist / album discovery

**Goal:** Tap artist or album from search/player to see more tracks.

**Current state:** `saavn.ts` has search, trending, related — **no** dedicated artist/album APIs yet.

**Tasks:**

1. Research JioSaavn unofficial API patterns used in `saavn.ts`; add:
   - `getArtistSongs(artistIdOrQuery)` or parse from song metadata
   - `getAlbumSongs(albumId)` 
   - Extend `Song` type only if needed (e.g. `artistId`, `albumId` on parse)
2. New routes: e.g. `src/app/artist/[id].tsx`, `src/app/album/[id].tsx` (or modal screens) listing songs with `SongCard`.
3. Link from `PlayerScreen`, `SongCard`, search results (tappable artist/album subtitles).
4. Loading/error/empty states consistent with Home search.

**Acceptance:** From a search result, open album page, play third track, mini player updates.

---

### 3. Audio quality setting (Profile → playback)

**Goal:** Profile quality picker (`AUDIO_QUALITY_KEY` in `ProfileScreen.tsx`) actually changes stream URL/bitrate.

**Tasks:**

1. Define quality enum used in app (match Profile UI labels: e.g. Low / Medium / High / Auto).
2. Centralize quality in a small module or context hook read by `saavn.ts` when building/decrypting stream URLs (see existing “320kbps” comment in `saavn.ts`).
3. On quality change: toast; optionally reload current track if playing (without jarring skip).
4. Persist key stays `@jam_audio_quality`.

**Acceptance:** Set Low vs High, inspect resolved `streamUrl` or audible bitrate difference on same song id.

---

### 4. Listening stats & shareable wrap

**Goal:** Expand stats from `LibraryContext` + `CyberListeningWrapModal` into shareable summary.

**Tasks:**

1. Ensure stats increment on meaningful play duration (avoid counting <10s skips if not already).
2. Wrap modal: top artists, top tracks, minutes listened, streak — pull from `LISTENING_STATS_KEY` data shape in `LibraryContext`.
3. Share: capture modal (or dedicated share card view) as PNG — use `react-native-view-shot` + `expo-sharing` (add deps if needed) OR share text summary if image capture is too heavy for first pass.
4. Profile entry point: “Your listening wrap” button.

**Acceptance:** Listen to several tracks → open wrap → share sheet opens with image or text.

---

### 5. Error & offline UX

**Goal:** Network failures are visible; offline blocks streaming actions gracefully.

**Files:** `src/services/networkMonitor.ts`, `src/components/OfflineStatusPill.tsx`, `src/context/ToastContext.tsx`, Saavn call sites in Home/Library.

**Tasks:**

1. Mount `OfflineStatusPill` globally (root layout or tabs) when offline.
2. Wrap Saavn fetches: on failure show toast with retry; don’t leave infinite spinners (`HomeScreen`, trending, search).
3. When offline: disable search/stream actions that require network; allow stashed playback and local library.
4. Optional: queue “retry when online” for failed stash downloads.

**Acceptance:** Toggle airplane mode → pill visible; search shows friendly error; stashed track still plays.

---

## Implementation order

1. Phase 1.1 Config  
2. Phase 1.5 Repo hygiene (quick)  
3. Phase 1.2 Offline stash  
4. Phase 1.3 Jam queue votes + permissions polish  
5. Phase 1.4 Deep links  
6. Phase 2.1 Background audio  
7. Phase 2.5 Offline/error UX  
8. Phase 2.3 Quality  
9. Phase 2.2 Artist/album  
10. Phase 2.4 Listening wrap share  

## Out of scope (do not implement in this prompt)

- Cloud auth, global friends (Phase 3)
- Socket-synced party games (Phase 4)
- Redis / room persistence on server
- Play Store legal/compliance docs

When finished, give a short changelog: files touched, how to test each acceptance criterion, and any follow-up risks (Android notification, Saavn API breakage).

## PROMPT END
