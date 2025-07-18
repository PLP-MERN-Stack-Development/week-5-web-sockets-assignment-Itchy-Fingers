import React, { useState } from 'react';

const RoomList = ({ rooms = [], onJoin, onLeave, onCreate }) => {
  const [newRoom, setNewRoom] = useState('');
  return (
    <div style={{ marginBottom: 16 }}>
      <h4>Rooms</h4>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {rooms.map((room) => (
          <li key={room}>
            <button onClick={() => onJoin(room)}>{room}</button>
            <button onClick={() => onLeave(room)} style={{ marginLeft: 8, background: '#e57373' }}>Leave</button>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 8 }}>
        <input
          type="text"
          placeholder="New room name"
          value={newRoom}
          onChange={e => setNewRoom(e.target.value)}
        />
        <button onClick={() => { onCreate(newRoom); setNewRoom(''); }} style={{ marginLeft: 8 }}>Create</button>
      </div>
    </div>
  );
};

export default RoomList; 