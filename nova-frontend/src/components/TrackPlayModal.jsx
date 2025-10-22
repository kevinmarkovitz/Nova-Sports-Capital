// src/components/TrackPlayModal.jsx
import { useState } from "react";

function TrackPlayModal({ bet, onClose, onSave }) {
  const [stake, setStake] = useState(bet.stake.toFixed(2));

  const handleSave = () => {
    onSave({ ...bet, stake: parseFloat(stake) });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Track New Play</h2>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="track-modal-details">
            <p>
              <strong>Game:</strong> {bet.game}
            </p>
            <p>
              <strong>Bet:</strong> {bet.bet}
            </p>
            <p>
              <strong>Bookmaker:</strong> {bet.bookmaker}
            </p>
            <p>
              <strong>Odds:</strong> {bet.odds > 0 ? "+" : ""}
              {bet.odds}
            </p>
            <div className="filter-group">
              <label htmlFor="stake-input">Stake:</label>
              <input
                id="stake-input"
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
              />
            </div>
          </div>
          <div className="track-modal-actions">
            <button className="modal-btn cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="modal-btn save" onClick={handleSave}>
              Save Play
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrackPlayModal;
