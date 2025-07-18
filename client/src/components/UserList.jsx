import React from 'react';

const UserList = ({ users = [], onSelectUser }) => (
  <div style={{ marginBottom: 16 }}>
    <h4>Online Users</h4>
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {users.map((user) => (
        <li key={user.userId || user}>
          <button style={{ background: 'none', color: '#1976d2', border: 'none', cursor: 'pointer' }} onClick={() => onSelectUser(user)}>
            {user.username || user}
          </button>
        </li>
      ))}
    </ul>
  </div>
);

export default UserList; 