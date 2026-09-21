const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// Health check endpoint for Render
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'jam-sync-server' });
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
    })),
  });
}

function broadcastMemberCount(roomId) {
  const roomSockets = io.sockets.adapter.rooms.get(roomId);
  const count = roomSockets ? roomSockets.size : 0;
  io.to(roomId).emit('member-count', count);
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

  // 1. Join room
  socket.on('join-room', (roomId) => {
    if (!roomId) return;
    currentRoomId = roomId;
    socket.join(roomId);

    const room = getOrCreateRoom(roomId);
    console.log(`[Socket ${socket.id}] Joined room ${roomId}`);

    // Immediately send current sync state and queue state to joining member
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
      })),
    });

    broadcastMemberCount(roomId);
  });

  // 2. Playback actions (play, pause, seek, change-song)
  socket.on('playback-action', ({ roomId, action }) => {
    const room = rooms.get(roomId);
    if (!room || !action) return;

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

  // 4. Queue Add (FIFO append)
  socket.on('queue-add', ({ roomId, songId, addedBy }) => {
    const room = rooms.get(roomId);
    if (!room || !songId) return;

    const entry = {
      songId,
      addedBy: addedBy || socket.handshake.query.username || 'User',
      socketId: socket.id,
    };

    room.queue.push(entry);
    console.log(`[Room ${roomId}] Queued song ${songId} by ${entry.addedBy}`);

    // If no song is currently playing in the room, start it immediately
    if (!room.songId) {
      advanceRoomQueue(room);
    } else {
      broadcastQueueState(room);
    }
  });

  // 5. Queue Remove (only allowed for original adder)
  socket.on('queue-remove', ({ roomId, songId }) => {
    const room = rooms.get(roomId);
    if (!room || !songId) return;

    const index = room.queue.findIndex((item) => item.songId === songId);
    if (index !== -1) {
      const item = room.queue[index];
      // Verify ownership by socket ID if applicable
      if (item.socketId && item.socketId !== socket.id) {
        console.warn(`[Room ${roomId}] Unauthorized remove attempt by ${socket.id}`);
        return;
      }

      room.queue.splice(index, 1);
      console.log(`[Room ${roomId}] Removed song ${songId} from queue`);
      broadcastQueueState(room);
    }
  });

  // 6. Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    if (currentRoomId) {
      broadcastMemberCount(currentRoomId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Jam Sync Server running on http://localhost:${PORT}`);
});
