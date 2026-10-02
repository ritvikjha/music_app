const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const triviaQuestions = require('./triviaQuestions');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e7, // 10MB to ensure voice notes and audio snippets stream safely
});

const PORT = process.env.PORT || 3000;
const DUEL_STATE_FILE = process.env.DUEL_STATE_FILE || path.join(__dirname, 'data', 'duel-state.json');

app.use(express.json());

// Health check endpoint for Fly.io and uptime monitors
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'jam-sync-server' });
});

// ==========================================
// Jarvis Brain LLM Proxy (Stage 3)
// Primary: Gemini 2.0 Flash (Free Tier)
// Secondary: Groq LLaMA 3.3 70B (Free Tier)
// ==========================================

const deviceRateLimits = new Map();
function checkRateLimit(deviceId, maxRequests = 30, windowMs = 60000) {
  const now = Date.now();
  let record = deviceRateLimits.get(deviceId);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    deviceRateLimits.set(deviceId, record);
    return true;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count++;
  return true;
}

// Clean up expired rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, record] of deviceRateLimits) {
    if (now > record.resetTime) deviceRateLimits.delete(id);
  }
}, 300000);

const JARVIS_SYSTEM_PROMPT = `You are J.A.R.V.I.S., a highly intelligent, calm, sophisticated AI assistant (inspired by Tony Stark's assistant).
Your personality: polite, articulate, dry British wit, loyal, concise (maximum 2 sentences per spokenReply). Address the user occasionally as "sir" or by context.
Analyze the user's transcript, conversation context, personal memory, and device state, then map it into a structured intent JSON object.

Allowed IntentNames:
- PLAY_SONG: slots: { query: string, artist?: string }
- PLAY_ARTIST: slots: { artist: string }
- PLAY_TRENDING: slots: {}
- PLAY_SIMILAR: slots: {}
- PLAY_MOOD: slots: { mood: string, query?: string } (e.g., "play something relaxing for sleep", "upbeat gym workout vibes")
- PLAY_MY_USUAL: slots: {} (plays the user's learned favorite genre or vibe)
- PAUSE: slots: {}
- RESUME: slots: {}
- NEXT: slots: {}
- PREVIOUS: slots: {}
- SEEK: slots: { seconds: number, relative: boolean }
- VOLUME_SET: slots: { percent: number }
- VOLUME_UP: slots: {}
- VOLUME_DOWN: slots: {}
- LIKE: slots: {}
- UNLIKE: slots: {}
- ADD_TO_QUEUE: slots: { query: string }
- PLAY_NEXT: slots: { query: string }
- SHUFFLE: slots: { on: boolean }
- REPEAT: slots: { mode: "off" | "all" | "one" }
- SLEEP_TIMER: slots: { minutes: number }
- CANCEL_SLEEP_TIMER: slots: {}
- WHAT_IS_PLAYING: slots: {}
- OPEN_SCREEN: slots: { screen: "home" | "library" | "jam" | "games" | "profile" | "player" | "friends" }
- CLEAR_QUEUE: slots: {}, needsConfirmation: true
- LEAVE_ROOM: slots: {}
- STATUS_REPORT: slots: {}
- PROTOCOL_NIGHT: slots: {}
- PROTOCOL_PARTY: slots: {}
- PROTOCOL_STEALTH: slots: {}
- PROTOCOL_MORNING: slots: {}
- PROTOCOL_DRIVE: slots: {}
- PROTOCOL_FOCUS: slots: {}
- REMEMBER: slots: { key: string, value: string } (stores facts, e.g. "remember my car parking is spot B4" -> key: "car parking", value: "spot B4")
- RECALL: slots: { query: string } (retrieves saved facts, e.g. "where did I park my car?")
- SET_REMINDER: slots: { task: string, time?: string }
- GET_WEATHER: slots: { location?: string }
- GET_TIME: slots: { timezone?: string }
- GET_DATE: slots: {}
- WEB_SEARCH: slots: { query: string }
- CALCULATE: slots: { expression: string }
- CONVERT_UNITS: slots: { value: number, from: string, to: string }
- CHECK_CALENDAR: slots: {}
- CONTACT_LOOKUP: slots: { name: string }
- MORNING_BRIEFING: slots: {}
- VISION_QUERY: slots: { question?: string }
- CHAT: slots: { reply: string } (for general questions, science, trivia, conversation, greetings; reply must be witty and under 2 sentences)
- UNKNOWN: slots: { raw: string }

Return ONLY valid JSON matching this schema:
{
  "intent": "<IntentName>",
  "slots": { ... },
  "confidence": <number between 0.0 and 1.0>,
  "spokenReply": "<concise, natural spoken reply for the user, max 2 sentences>",
  "needsConfirmation": <boolean, optional>,
  "source": "llm"
}`;

async function callGemini(promptText, apiKey, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: JARVIS_SYSTEM_PROMPT + '\n\n' + promptText }] }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 300
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Gemini status ${res.status}`);
    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) throw new Error('Empty Gemini response');
    const parsed = JSON.parse(candidate);
    parsed.source = 'llm';
    return parsed;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function callGroq(promptText, apiKey, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: JARVIS_SYSTEM_PROMPT },
          { role: 'user', content: promptText }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 300
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Groq status ${res.status}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty Groq response');
    const parsed = JSON.parse(content);
    parsed.source = 'llm';
    return parsed;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

app.post('/jarvis/brain', async (req, res) => {
  const startTime = Date.now();

  // 1. Verify shared token if configured
  const token = req.headers['x-jarvis-token'];
  const expectedToken = process.env.JARVIS_APP_TOKEN || 'jarvis-jam-secret-2026';
  if (token && token !== expectedToken) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  // 2. Rate limiting per device / IP (30 req/min)
  const deviceId = req.body?.deviceId || req.ip || 'anonymous';
  if (!checkRateLimit(deviceId)) {
    return res.status(429).json({ error: 'Rate limit exceeded (30 req/min)' });
  }

  const {
    transcript,
    currentSongTitle,
    currentSongArtist,
    isPlaying,
    queueLength,
    history,
    userNotes,
    musicProfile,
    timeOfDay,
    dayOfWeek,
    batteryPercent,
    isCharging,
    networkType
  } = req.body || {};
  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ error: 'Missing transcript' });
  }

  const prompt = `User transcript: "${transcript}"
Context:
- Current song: "${currentSongTitle || 'None'}" by "${currentSongArtist || 'Unknown'}"
- Playing: ${isPlaying ? 'yes' : 'no'}
- Queue length: ${queueLength || 0}
- Recent history: ${JSON.stringify(history || [])}
- Time of day: ${timeOfDay || 'unknown'}, Day: ${dayOfWeek || 'unknown'}
- Device Battery: ${batteryPercent !== undefined ? batteryPercent + '%' : 'unknown'} (Charging: ${isCharging ? 'yes' : 'no'})
- Network: ${networkType || 'unknown'}
- User Memory/Notes: ${userNotes && userNotes.length > 0 ? JSON.stringify(userNotes) : 'None'}
- User Music Profile: ${musicProfile ? JSON.stringify(musicProfile) : 'None'}

Map this to the appropriate intent schema in JSON.`;

  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  try {
    if (geminiKey) {
      try {
        const result = await callGemini(prompt, geminiKey);
        result.latencyMs = Date.now() - startTime;
        return res.json(result);
      } catch (geminiErr) {
        console.warn('[Jarvis Server] Gemini error, trying Groq fallback:', geminiErr.message);
      }
    }

    if (groqKey) {
      try {
        const result = await callGroq(prompt, groqKey);
        result.latencyMs = Date.now() - startTime;
        return res.json(result);
      } catch (groqErr) {
        console.warn('[Jarvis Server] Groq error:', groqErr.message);
      }
    }

    // Fallback if neither API is configured or available
    return res.json({
      intent: 'UNKNOWN',
      slots: { raw: transcript },
      confidence: 0,
      spokenReply: "I couldn't process that right now.",
      source: 'llm',
      latencyMs: Date.now() - startTime
    });
  } catch (err) {
    console.error('[Jarvis Server] Brain route error:', err.message);
    return res.json({
      intent: 'UNKNOWN',
      slots: { raw: transcript },
      confidence: 0,
      spokenReply: "Sorry, I had trouble understanding that.",
      source: 'llm',
      latencyMs: Date.now() - startTime
    });
  }
});

// ==========================================
// Phase 1: Real-Time Zero-Latency Streaming LLM
// Endpoint: POST /jarvis/brain/stream
// Streams SSE tokens to client in < 250ms
// ==========================================
app.post('/jarvis/brain/stream', async (req, res) => {
  const token = req.headers['x-jarvis-token'];
  const expectedToken = process.env.JARVIS_APP_TOKEN || 'jarvis-jam-secret-2026';
  if (token && token !== expectedToken) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  const deviceId = req.body?.deviceId || req.ip || 'anonymous';
  if (!checkRateLimit(deviceId)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  const { prompt, transcript, context } = req.body || {};
  const userText = prompt || transcript;
  if (!userText) {
    return res.status(400).json({ error: 'Missing prompt or transcript' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  const systemInstruction = `You are J.A.R.V.I.S., a sophisticated AI assistant.
Speak concisely with polite British wit (maximum 2 sentences).
Directly answer the user's question without preamble or filler.`;

  // 1. Try Gemini 2.0 Flash Streaming
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: systemInstruction + '\n\nUser: ' + userText }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 200
          }
        })
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader ? response.body.getReader() : null;
        let fullText = '';

        if (reader) {
          const decoder = new TextDecoder();
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr) {
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (chunk) {
                      fullText += chunk;
                      res.write(`data: ${JSON.stringify({ type: 'token', token: chunk })}\n\n`);
                    }
                  } catch (e) {}
                }
              }
            }
          }
        } else {
          // Node fetch stream
          for await (const chunk of response.body) {
            const str = chunk.toString();
            const lines = str.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr) {
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const tokenChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (tokenChunk) {
                      fullText += tokenChunk;
                      res.write(`data: ${JSON.stringify({ type: 'token', token: tokenChunk })}\n\n`);
                    }
                  } catch (e) {}
                }
              }
            }
          }
        }

        res.write(`data: ${JSON.stringify({ type: 'done', fullText: fullText.trim() })}\n\n`);
        return res.end();
      }
    } catch (err) {
      console.warn('[Jarvis Stream] Gemini streaming error, trying Groq fallback:', err.message);
    }
  }

  // 2. Groq LLaMA 3.3 Streaming Fallback
  if (groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          stream: true,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userText }
          ],
          max_tokens: 200,
          temperature: 0.3
        })
      });

      if (response.ok && response.body) {
        let fullText = '';
        for await (const chunk of response.body) {
          const str = chunk.toString();
          const lines = str.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullText += delta;
                  res.write(`data: ${JSON.stringify({ type: 'token', token: delta })}\n\n`);
                }
              } catch (e) {}
            }
          }
        }
        res.write(`data: ${JSON.stringify({ type: 'done', fullText: fullText.trim() })}\n\n`);
        return res.end();
      }
    } catch (err) {
      console.warn('[Jarvis Stream] Groq streaming error:', err.message);
    }
  }

  // Fallback single message
  const fallback = "I'm standing by, sir.";
  res.write(`data: ${JSON.stringify({ type: 'token', token: fallback })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'done', fullText: fallback })}\n\n`);
  res.end();
});

// ==========================================
// Phase 2: Multimodal Camera Vision
// Endpoint: POST /jarvis/vision
// Analyzes base64 JPEG from Camera2 via Gemini 2.0 Flash
// ==========================================
app.post('/jarvis/vision', async (req, res) => {
  const startTime = Date.now();
  const token = req.headers['x-jarvis-token'];
  const expectedToken = process.env.JARVIS_APP_TOKEN || 'jarvis-jam-secret-2026';
  if (token && token !== expectedToken) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  const { imageBase64, prompt } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ error: 'Missing imageBase64' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.json({
      spokenReply: "Vision processing requires a Gemini API key on the server, sir.",
      description: "Server missing GEMINI_API_KEY",
      latencyMs: Date.now() - startTime
    });
  }

  const queryPrompt = prompt && prompt.trim().length > 0
    ? prompt
    : "Describe what is directly in front of the camera concisely.";

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are J.A.R.V.I.S., Tony Stark's sophisticated AI assistant.
Inspect this image captured from the user's phone camera.
Answer the user's inquiry concisely in 1-2 spoken sentences with calm, polite British poise.
User prompt: "${queryPrompt}"`
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 150
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini vision HTTP ${response.status}`);
    }

    const data = await response.json();
    const spokenReply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      || "I see the image, but could not discern the details, sir.";

    return res.json({
      spokenReply,
      description: spokenReply,
      latencyMs: Date.now() - startTime
    });
  } catch (err) {
    console.error('[Jarvis Vision] Error:', err.message);
    return res.json({
      spokenReply: "I had difficulty analyzing that visual feed, sir.",
      description: err.message,
      latencyMs: Date.now() - startTime
    });
  }
});

// ==========================================
// Phase 2: Screen Understanding & Q&A
// Endpoint: POST /jarvis/screen-qa
// Analyzes accessibility hierarchy & foreground app
// ==========================================
app.post('/jarvis/screen-qa', async (req, res) => {
  const startTime = Date.now();
  const token = req.headers['x-jarvis-token'];
  const expectedToken = process.env.JARVIS_APP_TOKEN || 'jarvis-jam-secret-2026';
  if (token && token !== expectedToken) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  const { screenContent, appName, packageName, query } = req.body || {};

  // Compact screen elements: filter empty and take top texts
  const elements = Array.isArray(screenContent)
    ? screenContent
        .map(el => (el.text || el.desc || '').trim())
        .filter(t => t.length > 0)
        .slice(0, 35)
    : [];

  const summary = elements.join(' | ');
  const userQuery = query || "Summarize what is on my screen.";

  const promptText = `Active Application: ${appName || packageName || 'Current Screen'}
Visible Screen Text & Elements:
${summary || 'No text elements detected.'}

User Question: "${userQuery}"

Provide a natural, polite 1-2 sentence spoken summary answering the user's question directly.`;

  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are J.A.R.V.I.S., a sophisticated AI assistant.
${promptText}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 150
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (reply) {
          return res.json({
            spokenReply: reply,
            latencyMs: Date.now() - startTime
          });
        }
      }
    } catch (e) {
      console.warn('[Jarvis ScreenQA] Gemini error:', e.message);
    }
  }

  if (groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are J.A.R.V.I.S. Provide a 1-2 sentence concise spoken answer.' },
            { role: 'user', content: promptText }
          ],
          max_tokens: 150,
          temperature: 0.2
        })
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (reply) {
          return res.json({
            spokenReply: reply,
            latencyMs: Date.now() - startTime
          });
        }
      }
    } catch (e) {
      console.warn('[Jarvis ScreenQA] Groq error:', e.message);
    }
  }

  // Fallback if no LLM configured
  const topText = elements.slice(0, 3).join(', ');
  const fallback = topText
    ? `You are in ${appName || 'an app'}, viewing ${topText}, sir.`
    : `You are currently viewing ${appName || 'your screen'}, sir.`;

  return res.json({
    spokenReply: fallback,
    latencyMs: Date.now() - startTime
  });
});

/**
 * Room Data Structure:
 * {
 *   roomId: string,
 *   songId: string | null,
 *   durationSec: number,
 *   isPlaying: boolean,
 *   positionMs: number,
 *   serverTime: number,
 *   timer: Timeout | null,
 *   queue: Array<{
 *     songId: string,
 *     addedBy: string,
 *     socketId: string
 *   }>
 * }
 */
const rooms = new Map();
const persistedDuelGames = new Map();
try {
  const saved = JSON.parse(fs.readFileSync(DUEL_STATE_FILE, 'utf8'));
  for (const [roomId, game] of Object.entries(saved)) {
    if (game && Array.isArray(game.players) && game.players.length === 2) persistedDuelGames.set(roomId, game);
  }
  console.log(`[Persistence] Restored ${persistedDuelGames.size} duel(s)`);
} catch (error) {
  if (error.code !== 'ENOENT') console.error('[Persistence] Could not restore duel state:', error.message);
}

function persistDuelGames() {
  try {
    for (const [roomId, room] of rooms) {
      if (room.duelGame) persistedDuelGames.set(roomId, room.duelGame);
    }
    while (persistedDuelGames.size > 200) persistedDuelGames.delete(persistedDuelGames.keys().next().value);
    const saved = Object.fromEntries(persistedDuelGames);
    fs.mkdirSync(path.dirname(DUEL_STATE_FILE), { recursive: true });
    const tempFile = `${DUEL_STATE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(saved), 'utf8');
    fs.renameSync(tempFile, DUEL_STATE_FILE);
  } catch (error) {
    console.error('[Persistence] Could not save duel state:', error.message);
  }
}
const userPresences = new Map();
const globalActivityFeed = [];

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      roomId,
      songId: null,
      durationSec: 0,
      isPlaying: false,
      positionMs: 0,
      serverTime: Date.now(),
      timer: null,
      queue: [],
      hostSocketId: null,
      hostUsername: null,
      mutedUsers: new Set(),
      volumeWeight: 1.0,
      currentLyric: null,
      allowGuestQueue: true,
      allowGuestPlayback: true,
      members: new Map(),
      duelGame: persistedDuelGames.get(roomId) || null,
    });
  }
  return rooms.get(roomId);
}

function broadcastSyncState(room) {
  io.to(room.roomId).emit('sync-state', {
    songId: room.songId,
    isPlaying: room.isPlaying,
    positionMs: room.positionMs,
    serverTime: room.serverTime,
  });
}

function broadcastQueueState(room) {
  io.to(room.roomId).emit('queue-state', {
    roomId: room.roomId,
    entries: room.queue.map((item) => ({
      songId: item.songId,
      addedBy: item.addedBy,
      votes: item.votes || 0,
      upvoters: Array.from(item.upvoters || []),
    })),
  });
}

function broadcastMemberCount(roomId) {
  const roomSockets = io.sockets.adapter.rooms.get(roomId);
  const count = roomSockets ? roomSockets.size : 0;
  io.to(roomId).emit('member-count', count);
}

function publicDuelState(room, recipient) {
  if (!room.duelGame) return null;
  const game = room.duelGame;
  const state = { ...game };
  delete state.secretLieIndex;

  // Determine recipient's player index (0 or 1, or null if spectator)
  let playerIndex = -1;
  if (Array.isArray(game.playerSockets)) {
    playerIndex = game.playerSockets.indexOf(recipient.id);
  }
  if (playerIndex < 0 && recipient.data?.username) {
    playerIndex = game.players.findIndex((p) => p.toLowerCase() === recipient.data.username.toLowerCase());
  }
  state.myPlayerIndex = playerIndex >= 0 ? playerIndex : null;

  state.lieIndex = game.phase === 'result' || game.phase === 'finished' ? game.secretLieIndex : null;
  if (game.type === 'two_truths_lie' && game.phase !== 'result' && game.phase !== 'finished') {
    state.mySecretLieIndex = playerIndex === game.storyteller ? game.secretLieIndex : null;
  } else {
    state.mySecretLieIndex = null;
  }
  if (game.type === 'trivia_duel') {
    const question = triviaQuestions.find((item) => item.id === game.questionId);
    state.question = question ? { category: question.category, prompt: question.prompt, options: question.options } : null;
    state.answerIndex = game.phase === 'result' || game.phase === 'finished' ? game.answerIndex : null;
  }
  return state;
}

function broadcastDuelState(room) {
  const members = io.sockets.adapter.rooms.get(room.roomId);
  if (!members || !room.duelGame) return;
  const currentGame = room.duelGame.phase === 'finished' ? null : { type: room.duelGame.type, roomId: room.roomId };
  for (const socketId of members) {
    const member = io.sockets.sockets.get(socketId);
    if (member) {
      const username = member.data.username || 'Player';
      const key = member.userKey || `${username.toLowerCase()}#${member.data.tag || '0000'}`;
      const presence = userPresences.get(key) || {
        username: username,
        tag: member.data.tag || '0000',
        currentSong: null,
        isPlaying: false,
        isOnline: true,
        lastSeen: Date.now(),
        roomId: room.roomId,
      };
      presence.currentGame = currentGame;
      presence.isOnline = true;
      presence.lastSeen = Date.now();
      userPresences.set(key, presence);
      member.emit('duel-state', publicDuelState(room, member));
    }
  }
  io.emit('presence-sync', Array.from(userPresences.values()));
}

function duelError(socket, message) {
  socket.emit('duel-error', message);
}

function resetDuel(type, players, settings = {}, playerSockets = []) {
  const category = settings.category || 'Any topic';
  const difficulty = settings.difficulty || 'easy';
  const available = type === 'trivia_duel'
    ? triviaQuestions.filter((item) => (category === 'Any topic' || item.category === category) && item.difficulty === difficulty)
    : [];
  for (let i = available.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  const triviaIds = available.slice(0, 10).map((item) => item.id);
  return {
    type,
    players,
    playerSockets,
    turn: 0,
    scores: [0, 0],
    phase: type === 'word_duel' ? 'playing' : type === 'trivia_duel' ? 'question' : 'write',
    chain: [],
    round: 1,
    storyteller: 0,
    statements: [],
    guessIndex: null,
    secretLieIndex: null,
    winner: null,
    triviaIds,
    questionId: triviaIds[0] || null,
    answerIndex: null,
    selectedIndex: null,
    rematchVotes: [null, null],
    category: type === 'trivia_duel' ? category : null,
    difficulty: type === 'trivia_duel' ? difficulty : null,
  };
}

// Auto-advance to next song in FIFO queue
function advanceRoomQueue(room) {
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }

  if (room.queue.length > 0) {
    const nextItem = room.queue.shift();
    room.songId = nextItem.songId;
    room.positionMs = 0;
    room.isPlaying = true;
    room.serverTime = Date.now();

    console.log(`[Room ${room.roomId}] Auto-advancing to queued song ${nextItem.songId}`);
    broadcastSyncState(room);
    broadcastQueueState(room);
  } else {
    // No more songs in queue
    room.songId = null;
    room.isPlaying = false;
    room.positionMs = 0;
    room.serverTime = Date.now();

    console.log(`[Room ${room.roomId}] Queue empty. Cleared playback.`);
    broadcastSyncState(room);
  }
}

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);
  let currentRoomId = null;

  socket.on('register-user', (name) => {
    const username = String(name || '').trim().slice(0, 24);
    if (!username) return;
    socket.data.username = username;
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.members.set(username, socket.id);
        if (room.duelGame) {
          if (Array.isArray(room.duelGame.playerSockets)) {
            const matchIdx = room.duelGame.players.findIndex((p) => p.toLowerCase() === username.toLowerCase());
            if (matchIdx >= 0) {
              room.duelGame.playerSockets[matchIdx] = socket.id;
            }
          }
          socket.emit('duel-state', publicDuelState(room, socket));
        }
      }
    }
  });

  // 1. Join room
  socket.on('join-room', (roomId) => {
    if (!roomId) return;
    currentRoomId = roomId;
    socket.join(roomId);

    const room = getOrCreateRoom(roomId);
    const username = String(socket.data.username || socket.handshake.query?.username || 'Player').trim().slice(0, 24) || 'Player';
    socket.data.username = username;
    room.members.set(username, socket.id);
    console.log(`[Socket ${socket.id}] Joined room ${roomId}`);

    if (!room.hostSocketId) {
      room.hostSocketId = socket.id;
      room.hostUsername = socket.handshake.query?.username || 'DJ Host';
    }

    // Immediately send current sync state, queue state, and host info to joining member
    socket.emit('sync-state', {
      songId: room.songId,
      isPlaying: room.isPlaying,
      positionMs: room.isPlaying
        ? room.positionMs + (Date.now() - room.serverTime)
        : room.positionMs,
      serverTime: Date.now(),
    });

    socket.emit('queue-state', {
      roomId: room.roomId,
      entries: room.queue.map((item) => ({
        songId: item.songId,
        addedBy: item.addedBy,
        votes: item.votes || 0,
        upvoters: Array.from(item.upvoters || []),
      })),
    });

    socket.emit('host-state', {
      hostSocketId: room.hostSocketId,
      hostUsername: room.hostUsername,
      volumeWeight: room.volumeWeight || 1.0,
      mutedUsers: Array.from(room.mutedUsers || []),
      allowGuestQueue: room.allowGuestQueue !== false,
      allowGuestPlayback: room.allowGuestPlayback !== false,
    });

    if (room.currentLyric) {
      socket.emit('lyrics-sync', room.currentLyric);
    }

    if (room.duelGame) {
      if (Array.isArray(room.duelGame.playerSockets)) {
        const matchIdx = room.duelGame.players.findIndex((p) => p.toLowerCase() === username.toLowerCase());
        if (matchIdx >= 0) {
          room.duelGame.playerSockets[matchIdx] = socket.id;
        }
      }
      socket.emit('duel-state', publicDuelState(room, socket));
    }

    broadcastMemberCount(roomId);
  });

  socket.on('duel-start', ({ roomId, type, settings }) => {
    const room = rooms.get(roomId);
    if (!room || !socket.rooms.has(roomId)) return;
    if (!['word_duel', 'two_truths_lie', 'trivia_duel'].includes(type)) return duelError(socket, 'That game is not supported online yet.');
    
    // Resolve exactly the 2 connected sockets in this room via Socket.io adapter
    const roomSockets = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    if (roomSockets.length !== 2) {
      return duelError(socket, `Connect exactly two players to this room before starting a 1v1 game (${roomSockets.length} connected).`);
    }

    const s1 = io.sockets.sockets.get(roomSockets[0]);
    const s2 = io.sockets.sockets.get(roomSockets[1]);
    let name1 = s1?.data?.username || s1?.handshake?.query?.username || 'Player 1';
    let name2 = s2?.data?.username || s2?.handshake?.query?.username || 'Player 2';
    if (name1.toLowerCase() === name2.toLowerCase()) {
      name1 = `${name1} #1`;
      name2 = `${name2} #2`;
    }
    const connectedPlayers = [name1, name2];
    const playerSockets = [roomSockets[0], roomSockets[1]];

    if (room.duelGame && room.duelGame.phase !== 'finished') {
      if (room.duelGame.type === type && Array.isArray(room.duelGame.playerSockets) && room.duelGame.playerSockets.includes(socket.id)) {
        socket.emit('duel-state', publicDuelState(room, socket));
        return;
      }
      return duelError(socket, 'A game is already in progress in this room.');
    }
    const safeSettings = settings && typeof settings === 'object' ? settings : {};
    const category = safeSettings.category || 'Any topic';
    const difficulty = safeSettings.difficulty || 'easy';
    if (type === 'trivia_duel') {
      if (!['Any topic', ...new Set(triviaQuestions.map((item) => item.category))].includes(category)) return duelError(socket, 'Choose a valid trivia topic.');
      if (!['easy', 'medium', 'difficult'].includes(difficulty)) return duelError(socket, 'Choose a valid difficulty.');
      const matching = triviaQuestions.filter((item) => (category === 'Any topic' || item.category === category) && item.difficulty === difficulty);
      if (matching.length < 10) return duelError(socket, 'There are not enough questions for that choice yet. Try another topic or difficulty.');
    }
    room.duelGame = resetDuel(type, connectedPlayers, safeSettings, playerSockets);
    persistDuelGames();
    broadcastDuelState(room);
  });

  socket.on('duel-action', ({ roomId, action }) => {
    const room = rooms.get(roomId);
    const game = room?.duelGame;
    if (!room || !game || !socket.rooms.has(roomId)) return;
    
    let playerIndex = -1;
    if (Array.isArray(game.playerSockets)) {
      playerIndex = game.playerSockets.indexOf(socket.id);
    }
    if (playerIndex < 0 && socket.data?.username) {
      playerIndex = game.players.findIndex((p) => p.toLowerCase() === socket.data.username.toLowerCase());
    }
    if (playerIndex < 0) return duelError(socket, 'You are not one of the two players in this game.');
    if (!action || typeof action.type !== 'string') return;

    if (action.type === 'rematch-vote') {
      if (game.phase !== 'finished') return duelError(socket, 'Finish this game before choosing a rematch.');
      const nextType = action.gameType;
      if (!['word_duel', 'two_truths_lie', 'trivia_duel'].includes(nextType)) return duelError(socket, 'Choose a game for the rematch.');
      game.rematchVotes = Array.isArray(game.rematchVotes) ? game.rematchVotes : [null, null];
      game.rematchVotes[playerIndex] = nextType;
      const [firstVote, secondVote] = game.rematchVotes;
      if (firstVote && firstVote === secondVote) room.duelGame = resetDuel(firstVote, game.players, {
        category: game.category || 'Any topic',
        difficulty: game.difficulty || 'easy',
      }, game.playerSockets);
      persistDuelGames();
      broadcastDuelState(room);
      return;
    }

    if (game.type === 'word_duel' && action.type === 'word') {
      if (game.phase !== 'playing' || game.winner) return;
      if (playerIndex !== game.turn) return duelError(socket, 'Wait for your turn.');
      const word = String(action.word || '').trim().toLowerCase().replace(/[^a-z]/g, '');
      if (word.length < 2 || word.length > 32) return duelError(socket, 'Enter a word with 2 to 32 letters.');
      const lastLetter = game.chain.length ? game.chain[game.chain.length - 1].slice(-1) : null;
      const valid = !game.chain.includes(word) && (!lastLetter || word[0] === lastLetter);
      if (valid) {
        game.chain.push(word);
        game.turn = 1 - game.turn;
      } else {
        const scorer = 1 - playerIndex;
        game.scores[scorer] += 1;
        game.chain = [];
        game.turn = scorer;
        if (game.scores[scorer] >= 5) {
          game.phase = 'finished';
          game.winner = game.players[scorer];
        }
      }
      persistDuelGames();
      broadcastDuelState(room);
      if (!valid) socket.emit('duel-error', 'That word breaks the chain. Your opponent gets a point.');
      return;
    }

    if (game.type === 'two_truths_lie' && action.type === 'statements') {
      if (game.phase !== 'write' || playerIndex !== game.storyteller) return duelError(socket, 'It is not your turn to write.');
      const statements = Array.isArray(action.statements)
        ? action.statements.map((value) => String(value).trim().slice(0, 120))
        : [];
      const lieIndex = Number(action.lieIndex);
      if (statements.length !== 3 || statements.some((value) => !value) || new Set(statements.map((value) => value.toLowerCase())).size !== 3 || !Number.isInteger(lieIndex) || lieIndex < 0 || lieIndex > 2) {
        return duelError(socket, 'Add three different statements and mark one as the lie.');
      }
      game.statements = statements;
      game.secretLieIndex = lieIndex;
      game.guessIndex = null;
      game.phase = 'guess';
      game.turn = 1 - game.storyteller;
      persistDuelGames();
      broadcastDuelState(room);
      return;
    }

    if (game.type === 'two_truths_lie' && action.type === 'guess') {
      if (game.phase !== 'guess' || playerIndex !== game.turn) return duelError(socket, 'Wait for your opponent to finish writing.');
      const guessIndex = Number(action.index);
      if (!Number.isInteger(guessIndex) || guessIndex < 0 || guessIndex > 2) return;
      game.guessIndex = guessIndex;
      if (guessIndex === game.secretLieIndex) {
        game.scores[playerIndex] += 1;
        if (game.scores[playerIndex] >= 5) {
          game.phase = 'finished';
          game.winner = game.players[playerIndex];
        } else {
          game.phase = 'result';
        }
      } else {
        game.phase = 'result';
      }
      persistDuelGames();
      broadcastDuelState(room);
      return;
    }

    if (game.type === 'two_truths_lie' && action.type === 'next') {
      if (game.phase !== 'result') return duelError(socket, 'Wait for the answer to be revealed.');
      game.storyteller = 1 - game.storyteller;
      game.turn = game.storyteller;
      game.round += 1;
      game.phase = 'write';
      game.statements = [];
      game.secretLieIndex = null;
      game.guessIndex = null;
      persistDuelGames();
      broadcastDuelState(room);
      return;
    }

    if (game.type === 'trivia_duel' && action.type === 'answer') {
      if (game.phase !== 'question' || playerIndex !== game.turn) return duelError(socket, 'Wait for your turn.');
      const question = triviaQuestions.find((item) => item.id === game.questionId);
      const selectedIndex = Number(action.index);
      if (!question || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= question.options.length) return;
      game.selectedIndex = selectedIndex;
      game.answerIndex = question.answerIndex;
      if (selectedIndex === question.answerIndex) game.scores[playerIndex] += 1;
      game.phase = 'result';
      persistDuelGames();
      broadcastDuelState(room);
      return;
    }

    if (game.type === 'trivia_duel' && action.type === 'next') {
      if (game.phase !== 'result') return duelError(socket, 'Answer the question first.');
      if (game.round >= game.triviaIds.length) {
        game.phase = 'finished';
        game.winner = game.scores[0] === game.scores[1] ? 'Draw' : game.players[game.scores[0] > game.scores[1] ? 0 : 1];
      } else {
        game.round += 1;
        game.turn = 1 - game.turn;
        game.questionId = game.triviaIds[game.round - 1];
        game.answerIndex = null;
        game.selectedIndex = null;
        game.phase = 'question';
      }
      persistDuelGames();
      broadcastDuelState(room);
      return;
    }

    duelError(socket, 'That move is not allowed right now.');
  });

  socket.on('game-invite-send', ({ targetUsername, targetTag, roomId }) => {
    const target = String(targetUsername || '').trim().slice(0, 24);
    const tag = String(targetTag || '').trim();
    const code = String(roomId || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!target || !/^\d{4}$/.test(tag) || !room || !socket.rooms.has(code)) {
      return socket.emit('game-invite-error', 'Join a room and choose a saved friend with a valid tag first.');
    }
    if (target.toLowerCase() === String(socket.data.username || '').toLowerCase() && tag === String(socket.data.tag || '')) {
      return socket.emit('game-invite-error', 'You cannot invite yourself.');
    }
    const targetRoom = `inbox_${target.toLowerCase()}_${tag}`;
    const inbox = io.sockets.adapter.rooms.get(targetRoom);
    if (!inbox || inbox.size === 0) return socket.emit('game-invite-error', `${target} is offline right now.`);
    const runningGame = room.duelGame && room.duelGame.phase !== 'finished' ? room.duelGame.type : null;
    io.to(targetRoom).emit('game-invite', {
      from: { username: socket.data.username || 'A friend', tag: socket.data.tag || '0000' },
      roomId: code,
      gameType: runningGame,
    });
    socket.emit('game-invite-sent', { username: target });
  });

  // 2. Playback actions (play, pause, seek, change-song)
  socket.on('playback-action', ({ roomId, action }) => {
    const room = rooms.get(roomId);
    if (!room || !action || !socket.rooms.has(roomId)) return;
    if (socket.id !== room.hostSocketId && room.allowGuestPlayback === false) return;

    const now = Date.now();

    switch (action.type) {
      case 'play': {
        room.isPlaying = true;
        room.serverTime = now;
        broadcastSyncState(room);
        break;
      }
      case 'pause': {
        if (room.isPlaying) {
          room.positionMs += now - room.serverTime;
        }
        room.isPlaying = false;
        room.serverTime = now;
        broadcastSyncState(room);
        break;
      }
      case 'seek': {
        room.positionMs = Math.max(0, action.positionMs || 0);
        room.serverTime = now;
        broadcastSyncState(room);
        break;
      }
      case 'change-song': {
        room.songId = action.songId;
        room.positionMs = 0;
        room.isPlaying = true;
        room.serverTime = now;
        broadcastSyncState(room);
        break;
      }
      case 'skip-next': {
        advanceRoomQueue(room);
        break;
      }
    }
  });

  // 3. Request resync (called every ~7s by clients to eliminate drift)
  socket.on('request-resync', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const now = Date.now();
    const currentPosition = room.isPlaying
      ? room.positionMs + (now - room.serverTime)
      : room.positionMs;

    socket.emit('sync-state', {
      songId: room.songId,
      isPlaying: room.isPlaying,
      positionMs: currentPosition,
      serverTime: now,
    });
  });

  // 4. Queue Add (FIFO append with vote tracking)
  socket.on('queue-add', ({ roomId, songId, addedBy }) => {
    const room = rooms.get(roomId);
    if (!room || !songId || !socket.rooms.has(roomId)) return;
    if (socket.id !== room.hostSocketId && room.allowGuestQueue === false) return;

    const entry = {
      songId,
      addedBy: addedBy || socket.handshake.query.username || 'User',
      socketId: socket.id,
      votes: 0,
      upvoters: new Set(),
    };

    room.queue.push(entry);
    console.log(`[Room ${roomId}] Queued song ${songId} by ${entry.addedBy}`);

    io.to(roomId).emit('room-activity', {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      roomId,
      text: `${entry.addedBy} added a track to the queue`,
      user: { username: entry.addedBy },
      timestamp: Date.now(),
    });

    // If no song is currently playing in the room, start it immediately
    if (!room.songId) {
      advanceRoomQueue(room);
    } else {
      broadcastQueueState(room);
    }
  });

  // 5. Queue Remove (only allowed for original adder unless forced)
  socket.on('queue-remove', ({ roomId, songId, force }) => {
    const room = rooms.get(roomId);
    if (!room || !songId) return;

    const index = room.queue.findIndex((item) => item.songId === songId);
    if (index !== -1) {
      const item = room.queue[index];
      // Verify ownership by socket ID if applicable (unless force/advance)
      if (!force && item.socketId && item.socketId !== socket.id) {
        console.warn(`[Room ${roomId}] Unauthorized remove attempt by ${socket.id}`);
        return;
      }

      room.queue.splice(index, 1);
      console.log(`[Room ${roomId}] Removed song ${songId} from queue`);
      broadcastQueueState(room);
    }
  });

  // 6. Track Ended notification (auto-advance queue)
  socket.on('track-ended', ({ roomId, songId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.songId === songId) {
      advanceRoomQueue(room);
    }
  });

  // 7. Chat Message broadcast
  socket.on('chat-message', ({ roomId, message, user, id }) => {
    if (!roomId || !message) return;
    io.to(roomId).emit('chat-message', {
      id: id || `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      roomId,
      message,
      user: user || { username: 'Anonymous' },
      timestamp: Date.now(),
    });
  });

  // 8. Emoji Reaction broadcast
  socket.on('emoji-reaction', ({ roomId, emoji, user, id }) => {
    if (!roomId || !emoji) return;
    io.to(roomId).emit('emoji-reaction', {
      id: id || `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      roomId,
      emoji,
      user: user || { username: 'Anonymous' },
      timestamp: Date.now(),
    });
  });

  // 9. Queue Upvoting
  socket.on('queue-vote', ({ roomId, songId, voter }) => {
    const room = rooms.get(roomId);
    if (!room || !songId) return;

    const voterId = voter || socket.id;
    const entry = room.queue.find((item) => item.songId === songId);
    if (!entry) return;

    if (!entry.upvoters) {
      entry.upvoters = new Set();
      entry.votes = 0;
    }

    if (entry.upvoters.has(voterId)) {
      entry.upvoters.delete(voterId);
      entry.votes = Math.max(0, (entry.votes || 1) - 1);
    } else {
      entry.upvoters.add(voterId);
      entry.votes = (entry.votes || 0) + 1;
    }

    // Auto-sort queue by upvotes so most requested songs play first!
    room.queue.sort((a, b) => (b.votes || 0) - (a.votes || 0));

    console.log(`[Room ${roomId}] Upvote on ${songId}: ${entry.votes} total`);
    broadcastQueueState(room);
  });

  // 10. Room Activity broadcast
  socket.on('room-activity', ({ roomId, text, user }) => {
    if (!roomId || !text) return;
    io.to(roomId).emit('room-activity', {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      roomId,
      text,
      user: user || { username: 'Anonymous' },
      timestamp: Date.now(),
    });
  });

  // 11. Synchronized Lyrics Broadcast
  socket.on('lyrics-sync', ({ roomId, lineIndex, lineText, timestamp }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.currentLyric = { lineIndex, lineText, timestamp: timestamp || Date.now() };
    io.to(roomId).emit('lyrics-sync', room.currentLyric);
  });

  // 12. Voice Snippet Messaging
  socket.on('voice-snippet', ({ roomId, audioBase64, durationMs, user, id }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const username = user?.username || 'Jammer';
    if (room.mutedUsers && room.mutedUsers.has(username)) {
      console.warn(`[Room ${roomId}] Muted user ${username} attempted voice snippet`);
      return;
    }
    io.to(roomId).emit('voice-snippet', {
      id: id || `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      roomId,
      audioBase64,
      durationMs: durationMs || 3000,
      user: user || { username: 'Jammer' },
      timestamp: Date.now(),
    });
  });

  // 13. DJ Host Overrides (force skip, mute user, room volume weighting)
  socket.on('dj-override', ({ roomId, type, targetUser, volumeWeight }) => {
    const room = rooms.get(roomId);
    if (!room || !socket.rooms.has(roomId) || socket.id !== room.hostSocketId) return;

    if (type === 'force-skip') {
      advanceRoomQueue(room);
      io.to(roomId).emit('room-activity', {
        id: `${Date.now()}`,
        roomId,
        text: `DJ Host forced skip to next track`,
        user: { username: room.hostUsername || 'DJ' },
        timestamp: Date.now(),
      });
    } else if (type === 'mute-user' && targetUser) {
      if (room.mutedUsers.has(targetUser)) {
        room.mutedUsers.delete(targetUser);
      } else {
        room.mutedUsers.add(targetUser);
      }
      io.to(roomId).emit('muted-users-update', Array.from(room.mutedUsers));
      io.to(roomId).emit('room-activity', {
        id: `${Date.now()}`,
        roomId,
        text: `DJ Host ${room.mutedUsers.has(targetUser) ? 'muted' : 'unmuted'} ${targetUser}`,
        user: { username: room.hostUsername || 'DJ' },
        timestamp: Date.now(),
      });
    } else if (type === 'volume-weight' && typeof volumeWeight === 'number') {
      room.volumeWeight = Math.max(0, Math.min(1.5, volumeWeight));
      io.to(roomId).emit('volume-weight-update', { volumeWeight: room.volumeWeight });
    }
  });

  socket.on('room-permissions', ({ roomId, allowGuestQueue, allowGuestPlayback }) => {
    const room = rooms.get(roomId);
    if (!room || !socket.rooms.has(roomId) || socket.id !== room.hostSocketId) return;
    room.allowGuestQueue = allowGuestQueue !== false;
    room.allowGuestPlayback = allowGuestPlayback !== false;
    io.to(roomId).emit('host-state', {
      hostSocketId: room.hostSocketId,
      hostUsername: room.hostUsername,
      volumeWeight: room.volumeWeight || 1.0,
      mutedUsers: Array.from(room.mutedUsers),
      allowGuestQueue: room.allowGuestQueue,
      allowGuestPlayback: room.allowGuestPlayback,
    });
  });

  // 14. Live Presence & "Listening To..." Broadcast
  socket.on('presence-update', (data) => {
    if (!data || !data.username) return;
    const key = `${data.username.toLowerCase()}#${data.tag || '0000'}`;
    socket.data.username = String(data.username).trim().slice(0, 24) || socket.data.username || 'Player';
    socket.data.tag = String(data.tag || '0000').slice(0, 4);
    const presence = {
      username: data.username,
      tag: data.tag || '0000',
      currentSong: data.currentSong || null,
      isPlaying: Boolean(data.isPlaying),
      isOnline: true,
      currentGame: userPresences.get(key)?.currentGame || null,
      roomId: data.roomId || null,
      lastSeen: Date.now(),
      socketId: socket.id,
    };
    userPresences.set(key, presence);
    socket.userKey = key;
    io.emit('presence-sync', Array.from(userPresences.values()));
  });

  socket.on('get-presence', () => {
    socket.emit('presence-sync', Array.from(userPresences.values()));
  });

  // 15. Live Activity Feed Hub (Room creations, Track Upvotes, Playlist additions)
  socket.on('activity-event', (event) => {
    if (!event || !event.type) return;
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: event.type,
      user: event.user || { username: 'Anonymous' },
      meta: event.meta || '',
      roomId: event.roomId,
      timestamp: Date.now(),
    };
    globalActivityFeed.unshift(item);
    if (globalActivityFeed.length > 40) globalActivityFeed.pop();
    io.emit('activity-feed-update', item);
  });

  socket.on('get-activity-feed', () => {
    socket.emit('activity-feed-sync', globalActivityFeed);
  });

  // 16. Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    if (socket.userKey && userPresences.has(socket.userKey)) {
      const p = userPresences.get(socket.userKey);
      if (p.socketId === socket.id) {
        p.isPlaying = false;
        p.currentSong = null;
        p.isOnline = false;
        p.lastSeen = Date.now();
        io.emit('presence-sync', Array.from(userPresences.values()));
      }
    }
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room && room.hostSocketId === socket.id) {
        const roomSockets = io.sockets.adapter.rooms.get(currentRoomId);
        if (roomSockets && roomSockets.size > 0) {
          const nextHostId = roomSockets.values().next().value;
          room.hostSocketId = nextHostId;
          io.to(currentRoomId).emit('host-state', {
            hostSocketId: room.hostSocketId,
            hostUsername: io.sockets.sockets.get(nextHostId)?.handshake.query?.username || 'DJ Host',
            volumeWeight: room.volumeWeight || 1.0,
            mutedUsers: Array.from(room.mutedUsers),
            allowGuestQueue: room.allowGuestQueue !== false,
            allowGuestPlayback: room.allowGuestPlayback !== false,
          });
        } else {
          room.hostSocketId = null;
          room.hostUsername = null;
        }
      }
      broadcastMemberCount(currentRoomId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Jam Sync Server running on http://localhost:${PORT}`);
});
