// src/components/SearchBar.jsx
import { useState, useEffect } from "react";

function SearchBar({ onSearch }) {
  const [searchTerm, setSearchTerm] = useState("");

  // Debounce the search input to avoid re-filtering on every keystroke
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      onSearch(searchTerm);
    }, 300); // Wait 300ms after the user stops typing

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, onSearch]);

  return (
    <div className="search-bar-container">
      <input
        type="text"
        placeholder="Search for a team or player..."
        className="search-input"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  );
}

export default SearchBar;
