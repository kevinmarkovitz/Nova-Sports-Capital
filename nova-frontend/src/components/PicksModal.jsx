// src/components/PicksModal.jsx
import { useState, useMemo } from "react";
import { formatOdds, formatPoint } from "../helpers/formatters.js";
import { getTeamLogoPath } from "../helpers/team-helpers.js";

// --- Receive wagerType and kelly as props ---
function PicksModal({ title, picks, onClose, wagerType, kelly }) {
  const BANKROLL = 10000;
  const [sortConfig, setSortConfig] = useState({
    column: "date",
    direction: "desc",
  });

  // --- Replicate the wager and P/L logic from Analysis.jsx ---
  const getWager = (pick) => {
    const baseKey = `wager_${kelly}`;
    const dynamicKey = `${baseKey}_dynamic`;

    if (wagerType === "dynamic" && pick[dynamicKey] != null) {
      return parseFloat(pick[dynamicKey]);
    }
    return parseFloat(pick[baseKey]) || 0;
  };

  const calculatePnL = (pick) => {
    const wager = getWager(pick);
    if (wager === 0 || !pick.result) return 0;

    if (pick.result === "LOSS") return -wager;
    if (pick.result === "PUSH") return 0;
    if (pick.result === "WIN") {
      if (pick.odds >= 100) return wager * (pick.odds / 100);
      return wager * (100 / Math.abs(pick.odds));
    }
    return 0;
  };

  const sortedPicks = useMemo(() => {
    return [...picks].sort((a, b) => {
      let valA, valB;

      switch (sortConfig.column) {
        case "game":
          valA = a.teamA;
          valB = b.teamA;
          break;
        case "bet":
          valA = a.marketKey + (a.point || "");
          valB = b.marketKey + (b.point || "");
          break;
        case "pnl":
          // --- UPDATED: Use dynamic P/L for sorting ---
          valA = calculatePnL(a);
          valB = calculatePnL(b);
          break;
        case "edge":
          valA = a.edge;
          valB = b.edge;
          break;
        case "date":
        default:
          valA = new Date(a.gameTime);
          valB = new Date(b.gameTime);
          break;
      }

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    // --- UPDATED: Add dependencies for dynamic logic ---
  }, [picks, sortConfig, wagerType, kelly]);

  const handleSort = (column) => {
    let direction = "desc";
    if (sortConfig.column === column) {
      direction = sortConfig.direction === "asc" ? "desc" : "asc";
    }
    setSortConfig({ column, direction });
  };

  const getSortIndicator = (column) =>
    sortConfig.column === column
      ? sortConfig.direction === "asc"
        ? " ▲"
        : " ▼"
      : "";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body picks-modal-body">
          <table>
            <thead>
              <tr>
                <th
                  className="sortable-header"
                  onClick={() => handleSort("date")}
                >
                  Date{getSortIndicator("date")}
                </th>
                <th
                  className="sortable-header"
                  onClick={() => handleSort("game")}
                >
                  Game{getSortIndicator("game")}
                </th>
                <th
                  className="sortable-header"
                  onClick={() => handleSort("bet")}
                >
                  Bet{getSortIndicator("bet")}
                </th>
                <th>Book</th>
                <th>Odds</th>
                <th
                  className="sortable-header"
                  onClick={() => handleSort("edge")}
                >
                  Edge %{getSortIndicator("edge")}
                </th>
                <th>Stake</th>
                <th
                  className="sortable-header"
                  onClick={() => handleSort("pnl")}
                >
                  P/L{getSortIndicator("pnl")}
                </th>
                <th>Units</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {sortedPicks.map((pick) => {
                let sideName, teamLogo;
                const gameDescription = `${pick.teamB} @ ${pick.teamA}`;

                if (pick.marketKey === "moneyline") {
                  sideName = pick.side === "A" ? pick.teamA : pick.teamB;
                  teamLogo = getTeamLogoPath(sideName, pick.sport);
                } else if (pick.marketKey === "spreads") {
                  sideName = `${
                    pick.side === "A" ? pick.teamA : pick.teamB
                  } ${formatPoint(pick.point)}`;
                  teamLogo = getTeamLogoPath(
                    pick.side === "A" ? pick.teamA : pick.teamB,
                    pick.sport
                  );
                } else {
                  sideName = `${pick.player ? `${pick.player} ` : ""}${
                    pick.side === "A" ? "Over" : "Under"
                  } ${pick.point}`;
                  teamLogo = null;
                }

                // --- UPDATED: Use dynamic calculation functions ---
                const wager = getWager(pick);
                const pnl = calculatePnL(pick);
                const units = pnl / (BANKROLL / 100);

                return (
                  <tr key={pick.pickId}>
                    <td>{new Date(pick.gameTime).toLocaleDateString()}</td>
                    <td className="game-cell">{gameDescription}</td>
                    <td>
                      <div className="bet-cell">
                        {teamLogo && (
                          <img
                            src={teamLogo}
                            className="bet-cell-logo"
                            alt="team"
                          />
                        )}
                        <span>{sideName}</span>
                      </div>
                    </td>
                    <td>
                      <div className="book-cell-small">
                        <img
                          src={`/images/logos/${pick.bookmaker}.png`}
                          alt={pick.bookmaker}
                          className="book-logo-small"
                        />
                      </div>
                    </td>
                    <td>{formatOdds(pick.odds)}</td>
                    <td>+{(pick.edge * 100).toFixed(2)}%</td>
                    <td>${wager.toFixed(2)}</td>
                    <td
                      className={
                        pnl > 0 ? "text-green" : pnl < 0 ? "text-red" : ""
                      }
                    >
                      {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                    </td>
                    <td
                      className={
                        units > 0 ? "text-green" : units < 0 ? "text-red" : ""
                      }
                    >
                      {units >= 0 ? "+" : ""}
                      {units.toFixed(2)}
                    </td>
                    <td>
                      <span
                        className={`status-badge status-${pick.result.toLowerCase()}`}
                      >
                        {pick.result}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PicksModal;
