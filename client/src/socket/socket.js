// socket.js - Socket.io client setup

import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

// Socket.io connection URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// Create socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Custom hook for using socket.io
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Connect to socket server
  const connect = (username) => {
    socket.connect();
    if (username) {
      socket.emit('register', username);
    }
  };

  // Disconnect from socket server
  const disconnect = () => {
    socket.disconnect();
  };

  // Send a message (global chat)
  const sendMessage = (message) => {
    socket.emit('chat_message', message);
  };

  // Send a private message
  const sendPrivateMessage = (to, message) => {
    socket.emit('private_message', { to, message });
  };

  // Send a file/image in a private chat
  const sendPrivateFile = (to, file, filename, filetype, message) => {
    socket.emit('private_file', { to, file, filename, filetype, message });
  };

  // Send a read receipt for a private message
  const sendPrivateRead = (from, messageId) => {
    socket.emit('private_read', { from, messageId });
  };

  // Send a reaction for a private message
  const sendPrivateReaction = (to, messageId, reaction) => {
    socket.emit('private_reaction', { to, messageId, reaction });
  };

  // Get paginated messages
  const getMessages = (params, cb) => {
    socket.emit('get_messages', params, cb);
  };

  // Get unread count
  const getUnread = (key, cb) => {
    socket.emit('get_unread', { key }, cb);
  };

  // Clear unread count
  const clearUnread = (key) => {
    socket.emit('clear_unread', { key });
  };

  // Search messages
  const searchMessages = (params, cb) => {
    socket.emit('search_messages', params, cb);
  };

  // Set typing status
  const setTyping = (isTyping) => {
    socket.emit('typing', isTyping);
  };

  // Join a chat room
  const joinRoom = (room) => {
    socket.emit('join_room', room);
  };
  // Leave a chat room
  const leaveRoom = (room) => {
    socket.emit('leave_room', room);
  };
  // Send a message to a room
  const sendRoomMessage = (room, message) => {
    socket.emit('room_message', { room, message });
  };

  // Socket event listeners
  useEffect(() => {
    // Connection events
    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    // Message events
    const onReceiveMessage = (message) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
    };

    // Listen for global chat messages
    socket.on('chat_message', onReceiveMessage);

    // Private message events
    const onPrivateMessage = (message) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
    };
    socket.on('private_message', onPrivateMessage);

    // Private file events
    const onPrivateFile = (fileMsg) => {
      setLastMessage(fileMsg);
      setMessages((prev) => [...prev, fileMsg]);
    };
    socket.on('private_file', onPrivateFile);

    // Delivery acknowledgment
    const onMessageAck = (ack) => {
      // Optionally, you can update message status in your UI here
      // Example: mark message as delivered
      // console.log('Message delivered:', ack);
    };
    socket.on('message_ack', onMessageAck);

    // User events
    const onUserList = (userList) => {
      setUsers(userList);
    };

    const onUserJoined = (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${data.username} joined the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };
    const onUserLeft = (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${data.username} left the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);

    // Typing events
    const onTypingUsers = (users) => {
      setTypingUsers(users);
    };

    // Room message events
    const onRoomMessage = (message) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
    };
    socket.on('room_message', onRoomMessage);

    // Room notifications (user joined/left)
    const onRoomNotification = (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: data.message,
          timestamp: new Date().toISOString(),
          room: data.room,
        },
      ]);
    };
    socket.on('room_notification', onRoomNotification);

    // Read receipt events
    const onPrivateRead = (data) => {
      // Optionally, update message status in your UI here
      // Example: mark message as read
      // console.log('Message read:', data);
    };
    socket.on('private_read', onPrivateRead);

    // Private reaction events
    const onPrivateReaction = (data) => {
      // Optionally, update message reactions in your UI here
      // Example: add reaction to message
      // console.log('Message reaction:', data);
    };
    socket.on('private_reaction', onPrivateReaction);

    // Register event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('receive_message', onReceiveMessage);
    socket.on('private_message', onPrivateMessage);
    socket.on('user_list', onUserList);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('typing_users', onTypingUsers);
    socket.on('message_ack', onMessageAck);
    socket.on('room_message', onRoomMessage);
    socket.on('room_notification', onRoomNotification);
    socket.on('private_read', onPrivateRead);
    socket.on('private_reaction', onPrivateReaction);

    // Clean up event listeners
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message', onReceiveMessage);
      socket.off('private_message', onPrivateMessage);
      socket.off('user_list', onUserList);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('typing_users', onTypingUsers);
      socket.off('message_ack', onMessageAck);
      socket.off('chat_message', onReceiveMessage);
      socket.off('room_message', onRoomMessage);
      socket.off('room_notification', onRoomNotification);
      socket.off('private_file', onPrivateFile);
      socket.off('private_read', onPrivateRead);
      socket.off('private_reaction', onPrivateReaction);
    };
  }, []);

  return {
    socket,
    isConnected,
    lastMessage,
    messages,
    users,
    typingUsers,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    joinRoom,
    leaveRoom,
    sendRoomMessage,
    sendPrivateFile,
    sendPrivateRead,
    sendPrivateReaction,
    getMessages,
    getUnread,
    clearUnread,
    searchMessages,
  };
};

export default socket; 