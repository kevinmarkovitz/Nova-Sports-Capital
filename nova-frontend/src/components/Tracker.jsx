// src/components/Tracker.jsx
import { useState, useEffect } from "react";

function Tracker() {
  const [plays, setPlays] = useState([]);

  useEffect(() => {
    // Load plays from local storage when the component first mounts
    const savedPlays = JSON.parse(localStorage.getItem("trackedPlays")) || [];
    setPlays(savedPlays);
  }, []);

  const handleAddPlay = () => {
    // In a real app, this would open a modal to log a new play.
    // For now, we'll just add a sample play.
    const newPlay = {
      id: Date.now(),
      bet: "Sample Bet: Los Angeles Lakers -4.5",
      odds: -110,
      stake: 110,
      status: Math.random() < 0.5 ? "win" : "loss", // Randomly assign win/loss for now
    };
    const updatedPlays = [...plays, newPlay];
    setPlays(updatedPlays);
    localStorage.setItem("trackedPlays", JSON.stringify(updatedPlays));
  };

  // Calculate performance metrics
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let totalPnl = 0;
  let totalWagered = 0;

  plays.forEach((play) => {
    totalWagered += play.stake;
    if (play.status === "win") {
      wins++;
      if (play.odds >= 100) {
        totalPnl += play.stake * (play.odds / 100);
      } else {
        totalPnl += play.stake * (100 / Math.abs(play.odds));
      }
    } else if (play.status === "loss") {
      losses++;
      totalPnl -= play.stake;
    } else {
      pushes++;
    }
  });

  const roi = totalWagered > 0 ? (totalPnl / totalWagered) * 100 : 0;

  return (
    <div className="view-container">
      <h2>My Tracked Plays</h2>
      <div className="tracker-summary">
        <div className="summary-box">
          <div className="summary-value">
            {wins}-{losses}-{pushes}
          </div>
          <div className="summary-label">Record</div>
        </div>
        <div className="summary-box">
          <div className="summary-value">
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
          </div>
          <div className="summary-label">Total P/L</div>
        </div>
        <div className="summary-box">
          <div className="summary-value">{roi.toFixed(2)}%</div>
          <div className="summary-label">ROI</div>
        </div>
      </div>

      <button onClick={handleAddPlay} className="add-play-btn">
        Add New Play
      </button>

      <div className="tracked-plays-list">
        {plays.map((play) => (
          <div
            key={play.id}
            className={`tracked-play-card status-${play.status}`}
          >
            <p className="play-bet-name">{play.bet}</p>
            <div className="play-details">
              <span>Stake: ${play.stake.toFixed(2)}</span>
              <span>
                Odds: {play.odds > 0 ? "+" : ""}
                {play.odds}
              </span>
              <span className="play-status">{play.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Tracker;
