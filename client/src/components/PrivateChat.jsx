import React, { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const PrivateChat = ({ user, messages, onSend, onSendFile, onReact, onRead, onClose }) => {
  const [input, setInput] = useState('');
  const fileInputRef = useRef();

  useEffect(() => {
    if (messages && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (onRead && lastMsg && !lastMsg.read) {
        onRead(lastMsg);
      }
    }
  }, [messages, onRead]);

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onSendFile(reader.result, file.name, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ border: '1px solid #1976d2', borderRadius: 8, padding: 16, background: '#fff', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4>Private Chat with {user.username || user}</h4>
        <button onClick={onClose} style={{ background: '#e57373' }}>Close</button>
      </div>
      <MessageList messages={messages} onReact={onReact} />
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <MessageInput value={input} onChange={setInput} />
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
        <button type="button" onClick={() => fileInputRef.current.click()}>Send File</button>
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default PrivateChat; 