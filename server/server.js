const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for development; restrict in production
    methods: ['GET', 'POST']
  }
});

app.get('/', (req, res) => {
  res.send('Socket.io server is running!');
});

// Store connected users: { socketId: username }
const users = {};

// In-memory message storage
const messages = {
  global: [], // global chat
  rooms: {}, // { roomName: [messages] }
  privates: {} // { userId1_userId2: [messages] }
};
// In-memory unread count: { userId: { room/privateKey: count } }
const unreadCounts = {};

function getPrivateKey(id1, id2) {
  return [id1, id2].sort().join('_');
}

// Helper: store message
function storeMessage({ type, room, from, to, message, timestamp, file, filename, filetype, messageId }) {
  const msg = { messageId, from, to, message, timestamp, file, filename, filetype };
  if (type === 'global') {
    messages.global.push(msg);
  } else if (type === 'room') {
    if (!messages.rooms[room]) messages.rooms[room] = [];
    messages.rooms[room].push(msg);
  } else if (type === 'private') {
    const key = getPrivateKey(from.userId, to);
    if (!messages.privates[key]) messages.privates[key] = [];
    messages.privates[key].push(msg);
  }
}

// Helper: increment unread
function incrementUnread(userId, key) {
  if (!unreadCounts[userId]) unreadCounts[userId] = {};
  unreadCounts[userId][key] = (unreadCounts[userId][key] || 0) + 1;
}
// Helper: clear unread
function clearUnread(userId, key) {
  if (unreadCounts[userId]) unreadCounts[userId][key] = 0;
}

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Listen for username registration
  socket.on('register', (username) => {
    users[socket.id] = username;
    // Notify all clients that a user has joined
    io.emit('user_joined', { username, userId: socket.id, users: Object.values(users) });
    console.log(`${username} joined the chat.`);
  });

  // --- DELIVERY ACK for chat_message ---
  socket.on('chat_message', (message) => {
    const username = users[socket.id] || 'Anonymous';
    const timestamp = new Date().toISOString();
    const messageId = `${socket.id}_${Date.now()}`;
    // Store message
    storeMessage({ type: 'global', from: { username, userId: socket.id }, message, timestamp, messageId });
    // Broadcast
    io.emit('chat_message', {
      username,
      message,
      timestamp,
      userId: socket.id,
      messageId
    });
    // Delivery ack
    socket.emit('message_ack', { messageId, status: 'delivered', timestamp });
    console.log(`[${timestamp}] ${username}: ${message}`);
  });

  // --- DELIVERY ACK for private_message ---
  socket.on('private_message', ({ to, message }) => {
    const fromUsername = users[socket.id] || 'Anonymous';
    const timestamp = new Date().toISOString();
    const messageId = `${socket.id}_${Date.now()}`;
    const payload = {
      from: { username: fromUsername, userId: socket.id },
      to,
      message,
      timestamp,
      messageId
    };
    // Store message
    storeMessage({ type: 'private', from: { username: fromUsername, userId: socket.id }, to, message, timestamp, messageId });
    // Send to recipient
    io.to(to).emit('private_message', payload);
    // Optionally, send to sender for their chat history
    socket.emit('private_message', payload);
    // Delivery ack
    socket.emit('message_ack', { messageId, status: 'delivered', timestamp });
    // Unread count
    incrementUnread(to, getPrivateKey(socket.id, to));
    console.log(`[PRIVATE][${timestamp}] ${fromUsername} -> ${to}: ${message}`);
  });

  // --- DELIVERY ACK for room_message ---
  socket.on('room_message', ({ room, message }) => {
    const username = users[socket.id] || 'Anonymous';
    const timestamp = new Date().toISOString();
    const messageId = `${socket.id}_${Date.now()}`;
    // Store message
    storeMessage({ type: 'room', room, from: { username, userId: socket.id }, message, timestamp, messageId });
    io.to(room).emit('room_message', {
      username,
      message,
      timestamp,
      room,
      userId: socket.id,
      messageId
    });
    // Delivery ack
    socket.emit('message_ack', { messageId, status: 'delivered', timestamp });
    // Unread for all in room except sender
    const clients = io.sockets.adapter.rooms.get(room) || [];
    for (const clientId of clients) {
      if (clientId !== socket.id) incrementUnread(clientId, room);
    }
    console.log(`[${timestamp}] [${room}] ${username}: ${message}`);
  });

  // --- FILE SHARING for private_file ---
  socket.on('private_file', ({ to, file, filename, filetype, message }) => {
    const fromUsername = users[socket.id] || 'Anonymous';
    const timestamp = new Date().toISOString();
    const messageId = `${socket.id}_${Date.now()}`;
    const payload = {
      from: { username: fromUsername, userId: socket.id },
      to,
      file,
      filename,
      filetype,
      message,
      timestamp,
      messageId
    };
    // Store message
    storeMessage({ type: 'private', from: { username: fromUsername, userId: socket.id }, to, file, filename, filetype, message, timestamp, messageId });
    // Send to recipient
    io.to(to).emit('private_file', payload);
    // Optionally, send to sender for their chat history
    socket.emit('private_file', payload);
    // Delivery ack
    socket.emit('message_ack', { messageId, status: 'delivered', timestamp });
    // Unread count
    incrementUnread(to, getPrivateKey(socket.id, to));
    console.log(`[PRIVATE FILE][${timestamp}] ${fromUsername} -> ${to}: ${filename} (${filetype})`);
  });

  // --- PAGINATION: get_messages ---
  socket.on('get_messages', ({ type, room, to, page = 1, pageSize = 20 }, cb) => {
    let msgs = [];
    if (type === 'global') {
      msgs = messages.global;
    } else if (type === 'room' && room) {
      msgs = messages.rooms[room] || [];
    } else if (type === 'private' && to) {
      const key = getPrivateKey(socket.id, to);
      msgs = messages.privates[key] || [];
    }
    // Paginate
    const start = Math.max(0, msgs.length - page * pageSize);
    const end = msgs.length - (page - 1) * pageSize;
    const paged = msgs.slice(start, end);
    cb && cb(paged);
  });

  // --- UNREAD COUNT: get_unread ---
  socket.on('get_unread', ({ key }, cb) => {
    const count = (unreadCounts[socket.id] && unreadCounts[socket.id][key]) || 0;
    cb && cb(count);
  });

  // --- CLEAR UNREAD on join room or open private chat ---
  socket.on('clear_unread', ({ key }) => {
    clearUnread(socket.id, key);
  });

  // --- MESSAGE SEARCH ---
  socket.on('search_messages', ({ type, room, to, keyword }, cb) => {
    let msgs = [];
    if (type === 'global') {
      msgs = messages.global;
    } else if (type === 'room' && room) {
      msgs = messages.rooms[room] || [];
    } else if (type === 'private' && to) {
      const key = getPrivateKey(socket.id, to);
      msgs = messages.privates[key] || [];
    }
    const results = msgs.filter(m => (m.message && m.message.includes(keyword)) || (m.filename && m.filename.includes(keyword)));
    cb && cb(results);
  });

  // Typing indicator events
  socket.on('typing', () => {
    const username = users[socket.id] || 'Anonymous';
    socket.broadcast.emit('typing', { username, userId: socket.id });
  });

  socket.on('stop_typing', () => {
    const username = users[socket.id] || 'Anonymous';
    socket.broadcast.emit('stop_typing', { username, userId: socket.id });
  });

  // Private messaging
  socket.on('private_message', ({ to, message }) => {
    const fromUsername = users[socket.id] || 'Anonymous';
    const timestamp = new Date().toISOString();
    const payload = {
      from: { username: fromUsername, userId: socket.id },
      to,
      message,
      timestamp
    };
    // Send to recipient
    io.to(to).emit('private_message', payload);
    // Optionally, send to sender for their chat history
    socket.emit('private_message', payload);
    console.log(`[PRIVATE][${timestamp}] ${fromUsername} -> ${to}: ${message}`);
  });

  // Private file/image sharing
  socket.on('private_file', ({ to, file, filename, filetype, message }) => {
    const fromUsername = users[socket.id] || 'Anonymous';
    const timestamp = new Date().toISOString();
    const payload = {
      from: { username: fromUsername, userId: socket.id },
      to,
      file,
      filename,
      filetype,
      message,
      timestamp
    };
    // Send to recipient
    io.to(to).emit('private_file', payload);
    // Optionally, send to sender for their chat history
    socket.emit('private_file', payload);
    console.log(`[PRIVATE FILE][${timestamp}] ${fromUsername} -> ${to}: ${filename} (${filetype})`);
  });

  // Read receipts for private messages
  socket.on('private_read', ({ from, messageId }) => {
    const reader = { username: users[socket.id] || 'Anonymous', userId: socket.id };
    const readAt = new Date().toISOString();
    io.to(from).emit('private_read', {
      messageId,
      reader,
      readAt
    });
    console.log(`[READ RECEIPT] Message ${messageId} read by ${reader.username} (${reader.userId})`);
  });

  // Message reactions for private messages
  socket.on('private_reaction', ({ to, messageId, reaction }) => {
    const reactor = { username: users[socket.id] || 'Anonymous', userId: socket.id };
    const reactedAt = new Date().toISOString();
    const payload = {
      messageId,
      reaction,
      reactor,
      reactedAt
    };
    // Send to recipient
    io.to(to).emit('private_reaction', payload);
    // Send to sender
    socket.emit('private_reaction', payload);
    console.log(`[REACTION] Message ${messageId} reacted with '${reaction}' by ${reactor.username} (${reactor.userId})`);
  });

  // Join a chat room
  socket.on('join_room', (room) => {
    socket.join(room);
    const username = users[socket.id] || 'Anonymous';
    io.to(room).emit('room_notification', {
      message: `${username} joined room ${room}`,
      room,
      username,
      userId: socket.id
    });
    console.log(`${username} joined room: ${room}`);
  });

  // Leave a chat room
  socket.on('leave_room', (room) => {
    socket.leave(room);
    const username = users[socket.id] || 'Anonymous';
    io.to(room).emit('room_notification', {
      message: `${username} left room ${room}`,
      room,
      username,
      userId: socket.id
    });
    console.log(`${username} left room: ${room}`);
  });

  // Room-based messaging
  socket.on('room_message', ({ room, message }) => {
    const username = users[socket.id] || 'Anonymous';
    const timestamp = new Date().toISOString();
    io.to(room).emit('room_message', {
      username,
      message,
      timestamp,
      room,
      userId: socket.id
    });
    console.log(`[${timestamp}] [${room}] ${username}: ${message}`);
  });

  socket.on('disconnect', () => {
    const username = users[socket.id];
    if (username) {
      // Notify all clients that a user has left
      io.emit('user_left', { username, userId: socket.id });
      console.log(`${username} left the chat.`);
      delete users[socket.id];
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
}); 