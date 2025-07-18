import React from 'react';

const UnreadBadge = ({ count }) => (
  count > 0 ? (
    <span style={{ background: '#e57373', color: '#fff', borderRadius: '50%', padding: '2px 8px', fontSize: 12, marginLeft: 4 }}>
      {count}
    </span>
  ) : null
);

export default UnreadBadge; 