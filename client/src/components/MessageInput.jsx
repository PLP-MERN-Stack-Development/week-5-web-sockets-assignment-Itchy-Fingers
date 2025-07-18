import React from 'react';

const MessageInput = ({ value, onChange }) => (
  <input
    type="text"
    placeholder="Type a message..."
    value={value}
    onChange={e => onChange(e.target.value)}
    style={{ flex: 1 }}
  />
);

export default MessageInput; 