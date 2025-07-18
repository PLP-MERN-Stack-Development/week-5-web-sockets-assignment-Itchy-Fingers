import React, { useState, useMemo } from 'react';
import { useSocket } from '../socket/socket';
import UserList from './UserList';
import RoomList from './RoomList';
import PrivateChat from './PrivateChat';
import RoomChat from './RoomChat';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import SearchBar from './SearchBar';
import UnreadBadge from './UnreadBadge';

const ChatApp = () => {
  const [username, setUsername] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [currentChat, setCurrentChat] = useState('global'); // 'global', 'private', 'room'
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [rooms, setRooms] = useState(['general']);
  const [privateMessages, setPrivateMessages] = useState({}); // { userId: [msgs] }
  const [roomMessages, setRoomMessages] = useState({}); // { room: [msgs] }

  const {
    connect,
    disconnect,
    isConnected,
    messages,
    users,
    sendMessage,
    sendPrivateMessage,
    sendRoomMessage,
    sendPrivateFile,
    sendPrivateRead,
    sendPrivateReaction,
    joinRoom,
    leaveRoom,
    getMessages,
    getUnread,
    clearUnread,
    searchMessages,
  } = useSocket();

  // Register user
  const handleRegister = () => {
    if (username.trim()) {
      connect(username);
      setIsRegistered(true);
    }
  };

  // Handle sending global message
  const handleSendGlobal = (e) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  // Handle selecting a user for private chat
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setCurrentChat('private');
    // Optionally, fetch private messages
    getMessages({ type: 'private', to: user.userId }, (msgs) => {
      setPrivateMessages((prev) => ({ ...prev, [user.userId]: msgs }));
    });
    clearUnread(user.userId);
  };

  // Handle sending private message
  const handleSendPrivate = (msg) => {
    if (selectedUser) {
      sendPrivateMessage(selectedUser.userId, msg);
      // Optimistically add to local state
      setPrivateMessages((prev) => ({
        ...prev,
        [selectedUser.userId]: [
          ...(prev[selectedUser.userId] || []),
          { from: { username }, message: msg, timestamp: new Date().toISOString() },
        ],
      }));
    }
  };

  // Handle sending private file
  const handleSendPrivateFile = (file, filename, filetype) => {
    if (selectedUser) {
      sendPrivateFile(selectedUser.userId, file, filename, filetype);
    }
  };

  // Handle private message reaction
  const handlePrivateReact = (msg, reaction) => {
    if (selectedUser && msg.messageId) {
      sendPrivateReaction(selectedUser.userId, msg.messageId, reaction);
    }
  };

  // Handle private message read
  const handlePrivateRead = (msg) => {
    if (selectedUser && msg.messageId) {
      sendPrivateRead(selectedUser.userId, msg.messageId);
    }
  };

  // Handle closing private chat
  const handleClosePrivate = () => {
    setCurrentChat('global');
    setSelectedUser(null);
  };

  // Handle joining a room
  const handleJoinRoom = (room) => {
    joinRoom(room);
    setSelectedRoom(room);
    setCurrentChat('room');
    // Optionally, fetch room messages
    getMessages({ type: 'room', room }, (msgs) => {
      setRoomMessages((prev) => ({ ...prev, [room]: msgs }));
    });
    clearUnread(room);
  };

  // Handle leaving a room
  const handleLeaveRoom = (room) => {
    leaveRoom(room);
    setSelectedRoom(null);
    setCurrentChat('global');
  };

  // Handle creating a room
  const handleCreateRoom = (room) => {
    if (room && !rooms.includes(room)) {
      setRooms((prev) => [...prev, room]);
      handleJoinRoom(room);
    }
  };

  // Handle sending room message
  const handleSendRoom = (msg) => {
    if (selectedRoom) {
      sendRoomMessage(selectedRoom, msg);
      setRoomMessages((prev) => ({
        ...prev,
        [selectedRoom]: [
          ...(prev[selectedRoom] || []),
          { from: { username }, message: msg, timestamp: new Date().toISOString() },
        ],
      }));
    }
  };

  // Handle sending room file
  const handleSendRoomFile = (file, filename, filetype) => {
    // Implement room file sharing if needed
  };

  // Handle room message reaction
  const handleRoomReact = (msg, reaction) => {
    // Implement room message reactions if needed
  };

  // Handle room message read
  const handleRoomRead = (msg) => {
    // Implement room message read receipts if needed
  };

  // Handle search
  const handleSearch = (keyword) => {
    if (currentChat === 'global') {
      searchMessages({ type: 'global', keyword }, setSearchResults);
    } else if (currentChat === 'private' && selectedUser) {
      searchMessages({ type: 'private', to: selectedUser.userId, keyword }, setSearchResults);
    } else if (currentChat === 'room' && selectedRoom) {
      searchMessages({ type: 'room', room: selectedRoom, keyword }, setSearchResults);
    }
  };

  // Memoized message list for current chat
  const currentMessages = useMemo(() => {
    if (search && searchResults.length > 0) return searchResults;
    if (currentChat === 'global') return messages;
    if (currentChat === 'private' && selectedUser) return privateMessages[selectedUser.userId] || [];
    if (currentChat === 'room' && selectedRoom) return roomMessages[selectedRoom] || [];
    return [];
  }, [currentChat, selectedUser, selectedRoom, messages, privateMessages, roomMessages, search, searchResults]);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h2>Socket.io Chat App</h2>
      {!isRegistered ? (
        <div>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{ marginRight: 8 }}
          />
          <button onClick={handleRegister}>Join Chat</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <UserList users={users} onSelectUser={handleSelectUser} />
              <RoomList rooms={rooms} onJoin={handleJoinRoom} onLeave={handleLeaveRoom} onCreate={handleCreateRoom} />
            </div>
            <div style={{ flex: 3 }}>
              <SearchBar value={search} onChange={setSearch} onSearch={handleSearch} />
              {currentChat === 'private' && selectedUser ? (
                <PrivateChat
                  user={selectedUser}
                  messages={currentMessages}
                  onSend={handleSendPrivate}
                  onSendFile={handleSendPrivateFile}
                  onReact={handlePrivateReact}
                  onRead={handlePrivateRead}
                  onClose={handleClosePrivate}
                />
              ) : currentChat === 'room' && selectedRoom ? (
                <RoomChat
                  room={selectedRoom}
                  messages={currentMessages}
                  onSend={handleSendRoom}
                  onSendFile={handleSendRoomFile}
                  onReact={handleRoomReact}
                  onRead={handleRoomRead}
                  onLeave={() => handleLeaveRoom(selectedRoom)}
                />
              ) : (
                <>
                  <MessageList messages={currentMessages} />
                  <form onSubmit={handleSendGlobal} style={{ display: 'flex', gap: 8 }}>
                    <MessageInput value={input} onChange={setInput} />
                    <button type="submit">Send</button>
                    <button type="button" onClick={disconnect} style={{ marginLeft: 8 }}>Leave</button>
                  </form>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatApp; 