import React from 'react';

const SearchBar = ({ value, onChange, onSearch }) => (
  <form onSubmit={e => { e.preventDefault(); onSearch(value); }} style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
    <input
      type="text"
      placeholder="Search messages..."
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ flex: 1 }}
    />
    <button type="submit">Search</button>
  </form>
);

export default SearchBar; 