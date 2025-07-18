import React from 'react';

const MessageList = ({ messages = [], onReact }) => (
  <div style={{ minHeight: 200, maxHeight: 300, overflowY: 'auto', marginBottom: 8 }}>
    {messages.map((msg, idx) => (
      <div key={idx} style={{ marginBottom: 8, padding: 4, background: msg.system ? '#f0f0f0' : '#e3f2fd', borderRadius: 4 }}>
        {msg.system ? (
          <em style={{ color: '#888' }}>{msg.message}</em>
        ) : (
          <>
            <strong>{msg.username || msg.from?.username || 'User'}:</strong> {msg.message}
            {msg.file && (
              <div style={{ marginTop: 4 }}>
                {msg.filetype && msg.filetype.startsWith('image') ? (
                  <img src={msg.file} alt={msg.filename} style={{ maxWidth: 120, maxHeight: 120, display: 'block' }} />
                ) : (
                  <a href={msg.file} download={msg.filename}>{msg.filename}</a>
                )}
              </div>
            )}
            {msg.timestamp && (
              <span style={{ fontSize: 12, color: '#aaa', marginLeft: 8 }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
            )}
            {onReact && (
              <span style={{ marginLeft: 8 }}>
                <button onClick={() => onReact(msg, 'like')}>👍</button>
                <button onClick={() => onReact(msg, 'love')}>❤️</button>
                <button onClick={() => onReact(msg, 'laugh')}>😂</button>
              </span>
            )}
            {/* Read receipts and reactions can be displayed here if available */}
          </>
        )}
      </div>
    ))}
  </div>
);

export default MessageList; 