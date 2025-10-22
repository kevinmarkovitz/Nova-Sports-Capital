// src/components/PillSelector.jsx

function PillSelector({ lines, activeIndex, onPillClick }) {
  if (!lines || lines.length <= 1) {
    return null; // Don't render if there's only one line
  }

  return (
    <div className="pill-selector">
      {lines.map((line, index) => (
        <button
          key={line.point}
          className={`pill-button ${index === activeIndex ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation(); // Prevent the card's onClick from firing
            onPillClick(index);
          }}
        >
          {Math.abs(line.point)}
        </button>
      ))}
    </div>
  );
}

export default PillSelector;
