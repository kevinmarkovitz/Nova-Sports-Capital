// src/components/OddsModal.jsx
import { useState, useMemo } from "react";
import { getTeamLogoPath } from "../helpers/team-helpers.js";
import {
  formatOdds,
  formatPoint,
  americanToDecimal,
  americanToProb,
  formatDecimalOdds,
} from "../helpers/formatters.js";

const probToAmerican = (prob) => {
  if (!prob || prob <= 0 || prob >= 1) return null;
  let odds;
  if (prob >= 0.5) {
    odds = -((prob / (1 - prob)) * 100);
  } else {
    odds = 100 / prob - 100;
  }
  return odds;
};

function OddsModal({ data, onClose }) {
  const { item, lineData, marketType, isProp } = data;
  const [sortConfig, setSortConfig] = useState({
    column: "bookmaker",
    direction: "asc",
  });
  const [showVigFree, setShowVigFree] = useState(false);

  if (!item || !lineData) return null;

  const renderConsensusSummary = () => {
    const { trueOdds, trueMarketOdds } = lineData;
    if (!trueOdds || !trueMarketOdds) return null;
    let sideA_label,
      sideB_label,
      trueOddsA,
      trueOddsB,
      marketOddsA,
      marketOddsB;
    if (isProp) {
      sideA_label = `Over ${lineData.point}`;
      sideB_label = `Under ${lineData.point}`;
      trueOddsA = trueOdds.over;
      trueOddsB = trueOdds.under;
      marketOddsA = trueMarketOdds.over;
      marketOddsB = trueMarketOdds.under;
    } else {
      const logoA_path = getTeamLogoPath(item.teamA, item.sport);
      const logoB_path = getTeamLogoPath(item.teamB, item.sport);
      if (marketType === "moneyline") {
        sideA_label = (
          <div className="summary-team-label">
            <img src={logoA_path} className="summary-logo" alt="" />
            <span>{item.teamA}</span>
          </div>
        );
        sideB_label = (
          <div className="summary-team-label">
            <img src={logoB_path} className="summary-logo" alt="" />
            <span>{item.teamB}</span>
          </div>
        );
      } else if (marketType === "spreads") {
        sideA_label = (
          <div className="summary-team-label">
            <img src={logoA_path} className="summary-logo" alt="" />
            <span>
              {item.teamA} {formatPoint(lineData.point)}
            </span>
          </div>
        );
        sideB_label = (
          <div className="summary-team-label">
            <img src={logoB_path} className="summary-logo" alt="" />
            <span>
              {item.teamB} {formatPoint(-lineData.point)}
            </span>
          </div>
        );
      } else {
        sideA_label = `Over ${lineData.point}`;
        sideB_label = `Under ${lineData.point}`;
      }
      trueOddsA = trueOdds.oddsA;
      trueOddsB = trueOdds.oddsB;
      marketOddsA = trueMarketOdds.oddsA;
      marketOddsB = trueMarketOdds.oddsB;
    }
    const probTrueA = (americanToProb(trueOddsA) * 100).toFixed(1);
    const probTrueB = (americanToProb(trueOddsB) * 100).toFixed(1);
    const probMarketA = (americanToProb(marketOddsA) * 100).toFixed(1);
    const probMarketB = (americanToProb(marketOddsB) * 100).toFixed(1);
    return (
      <div className="consensus-summary">
        <table className="w-full text-center">
          <thead>
            <tr>
              <th className="w-1/3"></th>
              <th className="summary-header">The Nova Line</th>
              <th className="summary-header">Market Consensus</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="summary-label-cell">{sideA_label}</td>
              <td>
                <p className="font-bold text-main-primary">
                  {formatDecimalOdds(trueOddsA)}
                </p>
                <p className="summary-prob">({probTrueA}%)</p>
              </td>
              <td>
                <p className="font-bold text-main-primary">
                  {formatDecimalOdds(marketOddsA)}
                </p>
                <p className="summary-prob">({probMarketA}%)</p>
              </td>
            </tr>
            <tr>
              <td className="summary-label-cell pt-2">{sideB_label}</td>
              <td className="pt-2">
                <p className="font-bold text-main-primary">
                  {formatDecimalOdds(trueOddsB)}
                </p>
                <p className="summary-prob">({probTrueB}%)</p>
              </td>
              <td className="pt-2">
                <p className="font-bold text-main-primary">
                  {formatDecimalOdds(marketOddsB)}
                </p>
                <p className="summary-prob">({probMarketB}%)</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const getSortValue = (book, column) => {
    if (column === "bookmaker") return book.bookmaker;
    const oddsData = showVigFree ? book.trueOdds : book.vigOdds || book.odds;
    if (!oddsData) return null;
    let americanOdds =
      column === "sideA"
        ? oddsData.oddsA ?? oddsData.over
        : oddsData.oddsB ?? oddsData.under;
    return americanOdds !== null ? americanToDecimal(americanOdds) : null;
  };

  const booksWithTrueOdds = useMemo(() => {
    return (lineData.bookmakerOdds || []).map((book) => {
      const oddsForVig = book.vigOdds || book.odds;
      let trueOdds = null;
      if (oddsForVig) {
        const oddsA =
          oddsForVig.oddsA !== undefined ? oddsForVig.oddsA : oddsForVig.over;
        const oddsB =
          oddsForVig.oddsB !== undefined ? oddsForVig.oddsB : oddsForVig.under;
        if (oddsA != null && oddsB != null) {
          const probA = americanToProb(oddsA);
          const probB = americanToProb(oddsB);
          const totalProb = probA + probB;
          if (totalProb > 0) {
            const vigFreeProbA = probA / totalProb;
            trueOdds = {
              oddsA: probToAmerican(vigFreeProbA),
              oddsB: probToAmerican(1 - vigFreeProbA),
              over: probToAmerican(vigFreeProbA),
              under: probToAmerican(1 - vigFreeProbA),
            };
          }
        }
      }
      return { ...book, trueOdds };
    });
  }, [lineData.bookmakerOdds]);

  const sortedBooks = useMemo(() => {
    return [...booksWithTrueOdds].sort((a, b) => {
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
  }, [booksWithTrueOdds, sortConfig, showVigFree]);

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

  let headerA, headerB, title, subtitle;
  if (isProp) {
    title = item.player;
    subtitle = `${marketType.replace(/_/g, " ")} (${lineData.point})`;
    headerA = `Over ${lineData.point}`;
    headerB = `Under ${lineData.point}`;
  } else {
    title = `${item.teamB} @ ${item.teamA}`;
    subtitle = `${marketType}`;
    if (marketType === "moneyline") {
      headerA = item.teamA;
      headerB = item.teamB;
    } else if (marketType === "spreads") {
      headerA = `${item.teamA} ${formatPoint(lineData.point)}`;
      headerB = `${item.teamB} ${formatPoint(-lineData.point)}`;
    } else {
      // Totals
      headerA = `Over ${lineData.point}`;
      headerB = `Under ${lineData.point}`;
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            <p className="modal-subtitle">{subtitle}</p>
          </div>
          <div className="modal-controls">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showVigFree}
                onChange={() => setShowVigFree(!showVigFree)}
              />
              <span className="slider"></span>
            </label>
            <span>Vig-Free</span>
            <button className="modal-close-btn" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>
        <div className="modal-body">
          {renderConsensusSummary()}
          <table className="w-full text-left table-auto border-collapse odds-table">
            <thead>
              <tr>
                <th
                  className="sortable-header"
                  onClick={() => handleSort("bookmaker")}
                >
                  Bookmaker{getSortIndicator("bookmaker")}
                </th>
                <th
                  className="sortable-header"
                  onClick={() => handleSort("sideA")}
                >
                  {headerA}
                  {getSortIndicator("sideA")}
                </th>
                <th
                  className="sortable-header"
                  onClick={() => handleSort("sideB")}
                >
                  {headerB}
                  {getSortIndicator("sideB")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedBooks.map((book) => {
                const sharpIndicator =
                  book.type === "sharp" ? (
                    <span className="sharp-indicator" title="Sharp Bookmaker">
                      S
                    </span>
                  ) : null;
                const oddsToDisplay = showVigFree
                  ? book.trueOdds
                  : book.vigOdds || book.odds;
                return (
                  <tr key={book.bookmaker}>
                    <td>
                      <div className="book-cell">
                        {/* THIS LINE IS THE FIX */}
                        <img
                          src={`/images/logos/${book.bookmaker}.png`}
                          alt={book.bookmaker}
                          className="book-logo"
                        />
                        <span>
                          {book.bookmaker}
                          {sharpIndicator}
                        </span>
                      </div>
                    </td>
                    <td>
                      {formatOdds(oddsToDisplay?.oddsA ?? oddsToDisplay?.over)}
                    </td>
                    <td>
                      {formatOdds(oddsToDisplay?.oddsB ?? oddsToDisplay?.under)}
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

export default OddsModal;
