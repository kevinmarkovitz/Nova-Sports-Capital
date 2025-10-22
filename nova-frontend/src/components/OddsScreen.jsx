// src/components/OddsScreen.jsx
import { useState } from "react";
import { getTeamLogoPath } from "../helpers/team-helpers.js";
import {
  formatOdds,
  formatPoint,
  americanToDecimal,
  americanToProb,
} from "../helpers/formatters.js";

// Reusable card for the game list view
function GameListCard({ game, onSelectGame }) {
  const logoA = getTeamLogoPath(game.teamA, game.sport);
  const logoB = getTeamLogoPath(game.teamB, game.sport);

  return (
    <div className="game-list-card" onClick={() => onSelectGame(game)}>
      <div className="glc-teams">
        <div>
          <div className="glc-team-item">
            <img src={logoB} className="glc-logo" />
            <span>{game.teamB}</span>
          </div>
          <div className="glc-team-item">
            <img src={logoA} className="glc-logo" />
            <span>@ {game.teamA}</span>
          </div>
        </div>
        <div className="glc-info">
          <p>{game.sport}</p>
          <p>{new Date(game.gameTime).toLocaleDateString()}</p>
          <p>
            {new Date(game.gameTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

// Reusable table for the detail view
function OddsTable({ lineData, game, marketType }) {
  const [sortConfig, setSortConfig] = useState({
    column: "bookmaker",
    direction: "asc",
  });

  const getSortValue = (book, column) => {
    if (column === "bookmaker") return book.bookmaker;
    const oddsData = book.vigOdds || book.odds;
    if (!oddsData) return null;
    let americanOdds =
      column === "sideA"
        ? oddsData.oddsA ?? oddsData.over
        : oddsData.oddsB ?? oddsData.under;
    return americanOdds !== null ? americanToDecimal(americanOdds) : null;
  };

  const sortedBooks = [...lineData.bookmakerOdds].sort((a, b) => {
    let valA = getSortValue(a, sortConfig.column);
    let valB = getSortValue(b, sortConfig.column);
    if (valA == null)
      valA = sortConfig.direction === "asc" ? Infinity : -Infinity;
    if (valB == null)
      valB = sortConfig.direction === "asc" ? Infinity : -Infinity;
    if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
    if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (column) => {
    let direction = "desc";
    if (sortConfig.column === column) {
      direction = sortConfig.direction === "asc" ? "desc" : "asc";
    } else if (column === "bookmaker") {
      direction = "asc";
    }
    setSortConfig({ column, direction });
  };

  const getSortIndicator = (column) =>
    sortConfig.column === column
      ? sortConfig.direction === "asc"
        ? " ▲"
        : " ▼"
      : "";

  let headerA, headerB;
  if (marketType === "moneyline") {
    headerA = game.teamA;
    headerB = game.teamB;
  } else if (marketType === "spreads") {
    headerA = `${game.teamA} ${formatPoint(lineData.point)}`;
    headerB = `${game.teamB} ${formatPoint(-lineData.point)}`;
  } else {
    // Totals
    headerA = `Over ${lineData.point}`;
    headerB = `Under ${lineData.point}`;
  }

  return (
    <table className="w-full text-left table-auto border-collapse odds-table">
      <thead>
        <tr>
          <th
            className="sortable-header"
            onClick={() => handleSort("bookmaker")}
          >
            Bookmaker{getSortIndicator("bookmaker")}
          </th>
          <th className="sortable-header" onClick={() => handleSort("sideA")}>
            {headerA}
            {getSortIndicator("sideA")}
          </th>
          <th className="sortable-header" onClick={() => handleSort("sideB")}>
            {headerB}
            {getSortIndicator("sideB")}
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedBooks.map((book) => (
          <tr key={book.bookmaker}>
            <td>
              <div className="book-cell">
                <img
                  src={`/images/logos/${book.bookmaker}.png`}
                  alt={book.bookmaker}
                  className="book-logo"
                />
                <span>{book.bookmaker}</span>
              </div>
            </td>
            <td>{formatOdds(book.vigOdds?.oddsA ?? book.odds?.over)}</td>
            <td>{formatOdds(book.vigOdds?.oddsB ?? book.odds?.under)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OddsScreen({ games, props }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedMarket, setSelectedMarket] = useState("moneyline");

  if (selectedGame) {
    const lineData =
      selectedGame[selectedMarket]?.[0] || selectedGame[selectedMarket]; // Handle array or object
    return (
      <div className="odds-screen-detail">
        <button onClick={() => setSelectedGame(null)} className="back-button">
          ← Back to All Games
        </button>
        <h2>
          {selectedGame.teamB} @ {selectedGame.teamA}
        </h2>
        <div className="market-selector">
          {selectedGame.moneyline && (
            <button
              onClick={() => setSelectedMarket("moneyline")}
              className={selectedMarket === "moneyline" ? "active" : ""}
            >
              Moneyline
            </button>
          )}
          {selectedGame.spreads && (
            <button
              onClick={() => setSelectedMarket("spreads")}
              className={selectedMarket === "spreads" ? "active" : ""}
            >
              Spread
            </button>
          )}
          {selectedGame.totals && (
            <button
              onClick={() => setSelectedMarket("totals")}
              className={selectedMarket === "totals" ? "active" : ""}
            >
              Total
            </button>
          )}
        </div>
        {lineData ? (
          <OddsTable
            lineData={lineData}
            game={selectedGame}
            marketType={selectedMarket}
          />
        ) : (
          <p>No data for this market.</p>
        )}
      </div>
    );
  }

  // Game List View
  return (
    <div className="game-list-view">
      {games
        .sort((a, b) => new Date(a.gameTime) - new Date(b.gameTime))
        .map((game) => (
          <GameListCard
            key={game.id}
            game={game}
            onSelectGame={setSelectedGame}
          />
        ))}
    </div>
  );
}

export default OddsScreen;
