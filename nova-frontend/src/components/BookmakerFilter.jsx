// src/components/BookmakerFilter.jsx
import { useState, useEffect, useRef } from "react";
import { getBookmakerLogo } from "../helpers/bookmakerLogos.js";

function BookmakerFilter({ availableBooks, selectedBooks, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleCheckboxChange = (book) => {
    const currentIndex = selectedBooks.indexOf(book);
    const newSelectedBooks = [...selectedBooks];

    if (currentIndex === -1) {
      newSelectedBooks.push(book);
    } else {
      newSelectedBooks.splice(currentIndex, 1);
    }
    onChange(newSelectedBooks);
  };

  const getButtonText = () => {
    if (selectedBooks.length === 0) return "All Books";
    if (selectedBooks.length === 1) return selectedBooks[0];
    return `${selectedBooks.length} Books Selected`;
  };

  return (
    <div className="filter-group bookmaker-filter" ref={wrapperRef}>
      <label>Bookmakers:</label>
      <button
        className="bookmaker-filter-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        {getButtonText()} <span>&#9662;</span>
      </button>

      {isOpen && (
        <div className="bookmaker-filter-dropdown">
          <div
            className="dropdown-item"
            onClick={() => onChange([])} // Clear all selections
          >
            <input
              type="checkbox"
              checked={selectedBooks.length === 0}
              readOnly
            />
            <label>All Books</label>
          </div>
          {availableBooks.map((book) => (
            <div
              key={book}
              className="dropdown-item"
              onClick={() => handleCheckboxChange(book)}
            >
              <input
                type="checkbox"
                checked={selectedBooks.includes(book)}
                readOnly
              />
              <img
                src={getBookmakerLogo(book)}
                alt={book}
                className="book-logo"
              />
              <label>{book}</label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BookmakerFilter;
