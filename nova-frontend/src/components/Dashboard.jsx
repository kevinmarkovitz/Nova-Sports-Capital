// src/components/Dashboard.jsx
import { useState, useMemo } from "react";
import GameCard from "./GameCard";
import { americanToProb } from "../helpers/formatters.js";

function Dashboard({
  games,
  systemPicks,
  openModal,
  bankroll,
  setBankroll,
  kelly,
  setKelly,
}) {
  if (!games) {
    return (
      <div className="dashboard-view">
        <h2>Loading Game Data...</h2>
      </div>
    );
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    sport: [],
    market: [],
    sortBy: "edge",
  });

  const [isSportDropdownOpen, setIsSportDropdownOpen] = useState(false);
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);

  const handleSportChange = (sport) => {
    setFilters((prevFilters) => {
      const currentSports = prevFilters.sport;
      if (sport === "All") {
        setIsSportDropdownOpen(false);
        return { ...prevFilters, sport: [] };
      }
      const newSports = currentSports.includes(sport)
        ? currentSports.filter((s) => s !== sport)
        : [...currentSports, sport];
      return { ...prevFilters, sport: newSports };
    });
  };

  const handleMarketChange = (market) => {
    setFilters((prevFilters) => {
      const currentMarkets = prevFilters.market;
      if (market === "All") {
        setIsMarketDropdownOpen(false);
        return { ...prevFilters, market: [] };
      }
      const newMarkets = currentMarkets.includes(market)
        ? currentMarkets.filter((m) => m !== market)
        : [...currentMarkets, market];
      return { ...prevFilters, market: newMarkets };
    });
  };

  const allIndividualBets = useMemo(() => {
    if (!games || !systemPicks) return [];

    // 1. Find the single best historical pick for each MARKET (ignoring side).
    const historicalMaxEdgeMap = new Map();
    systemPicks.forEach((pick) => {
      const marketIdentifier = `${pick.gameId}-${pick.marketKey}-${pick.point}`;
      if (
        !historicalMaxEdgeMap.has(marketIdentifier) ||
        pick.edge > historicalMaxEdgeMap.get(marketIdentifier).edge
      ) {
        historicalMaxEdgeMap.set(marketIdentifier, pick);
      }
    });

    const bets = [];
    const calculateEdge = (trueOdds, marketOdds) => {
      return americanToProb(trueOdds) - americanToProb(marketOdds);
    };

    games.forEach((game) => {
      ["moneyline", "spreads", "totals"].forEach((marketType) => {
        if (game[marketType]) {
          game[marketType].forEach((line) => {
            if (line.trueOdds && line.trueMarketOdds) {
              // 2. Look up the historical max edge using the market-level identifier.
              const marketIdentifier = `${game.id}-${marketType}-${line.point}`;
              const historicalPick = historicalMaxEdgeMap.get(marketIdentifier);

              // Process Side A
              const edgeA = calculateEdge(
                line.trueOdds.oddsA,
                line.trueMarketOdds.oddsA
              );
              if (edgeA > 0) {
                const pickId = `${game.id}-${marketType}-${line.point}-A`;
                bets.push({
                  game,
                  line,
                  marketType,
                  side: "A",
                  edge: edgeA,
                  pickId,
                  // --- BUG FIX: Use the correct variable ---
                  historicalPick: historicalPick,
                });
              }

              // Process Side B
              const edgeB = calculateEdge(
                line.trueOdds.oddsB,
                line.trueMarketOdds.oddsB
              );
              if (edgeB > 0) {
                let pointForId = line.point;
                if (
                  marketType === "spreads" &&
                  typeof pointForId === "number"
                ) {
                  pointForId = -pointForId;
                }
                const pickId = `${game.id}-${marketType}-${pointForId}-B`;
                bets.push({
                  game,
                  line,
                  marketType,
                  side: "B",
                  edge: edgeB,
                  pickId,
                  // --- BUG FIX: Use the correct variable ---
                  historicalPick: historicalPick,
                });
              }
            }
          });
        }
      });
    });
    return bets;
  }, [games, systemPicks]);
  const allSports = useMemo(() => {
    if (!games) return [];
    return [...new Set(games.map((g) => g.sport))].sort();
  }, [games]);

  const availableMarkets = ["spreads", "totals", "moneyline"];

  const sortedAndFilteredBets = useMemo(() => {
    let betsToDisplay = allIndividualBets;
    if (filters.sport.length > 0) {
      betsToDisplay = betsToDisplay.filter((bet) =>
        filters.sport.includes(bet.game.sport)
      );
    }
    if (filters.market.length > 0) {
      betsToDisplay = betsToDisplay.filter((bet) =>
        filters.market.includes(bet.marketType)
      );
    }
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      betsToDisplay = betsToDisplay.filter(
        (bet) =>
          bet.game.teamA.toLowerCase().includes(searchTermLower) ||
          bet.game.teamB.toLowerCase().includes(searchTermLower)
      );
    }
    const sortableArray = [...betsToDisplay];
    if (filters.sortBy === "time") {
      return sortableArray.sort(
        (a, b) => new Date(a.game.gameTime) - new Date(b.game.gameTime)
      );
    }
    if (filters.sortBy === "edge") {
      return sortableArray.sort(
        (a, b) => (b.edge || -Infinity) - (a.edge || -Infinity)
      );
    }
    return sortableArray;
  }, [allIndividualBets, filters, searchTerm]);

  const sportSelectionText =
    filters.sport.length === 0 ? "All Sports" : filters.sport.join(", ");
  const marketSelectionText =
    filters.market.length === 0 ? "All Markets" : filters.market.join(", ");

  return (
    <div className="dashboard-view">
      <div className="filters">
        <div className="filter-group">
          <label>Sport:</label>
          <div className="dropdown-container">
            <button
              className="dropdown-button"
              onClick={() => setIsSportDropdownOpen(!isSportDropdownOpen)}
            >
              {sportSelectionText}
            </button>
            {isSportDropdownOpen && (
              <div className="dropdown-menu">
                <label>
                  <input
                    type="checkbox"
                    checked={filters.sport.length === 0}
                    onChange={() => handleSportChange("All")}
                  />
                  All Sports
                </label>
                {allSports.map((sport) => (
                  <label key={sport}>
                    <input
                      type="checkbox"
                      checked={filters.sport.includes(sport)}
                      onChange={() => handleSportChange(sport)}
                    />
                    {sport}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="filter-group">
          <label>Market:</label>
          <div className="dropdown-container">
            <button
              className="dropdown-button"
              onClick={() => setIsMarketDropdownOpen(!isMarketDropdownOpen)}
            >
              {marketSelectionText}
            </button>
            {isMarketDropdownOpen && (
              <div className="dropdown-menu">
                <label>
                  <input
                    type="checkbox"
                    checked={filters.market.length === 0}
                    onChange={() => handleMarketChange("All")}
                  />
                  All Markets
                </label>
                {availableMarkets.map((market) => (
                  <label key={market}>
                    <input
                      type="checkbox"
                      checked={filters.market.includes(market)}
                      onChange={() => handleMarketChange(market)}
                    />
                    {market.charAt(0).toUpperCase() + market.slice(1)}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="filter-group">
          <label htmlFor="sort-by">Sort By:</label>
          <select
            id="sort-by"
            value={filters.sortBy}
            onChange={(e) =>
              setFilters((f) => ({ ...f, sortBy: e.target.value }))
            }
          >
            <option value="edge">Highest Edge</option>
            <option value="time">Game Time</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="search-bar">Search:</label>
          <input
            id="search-bar"
            type="text"
            placeholder="Search for a team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-bar"
          />
        </div>
        <div className="filter-group global-input ml-auto">
          <label htmlFor="global-bankroll">Bankroll:</label>
          <input
            id="global-bankroll"
            type="number"
            value={bankroll}
            onChange={(e) => setBankroll(e.target.value)}
            placeholder="$10000"
          />
        </div>
        <div className="filter-group global-input">
          <label htmlFor="global-kelly">Kelly Multiplier:</label>
          <input
            id="global-kelly"
            type="number"
            value={kelly}
            onChange={(e) => setKelly(e.target.value)}
            placeholder="0.5"
            step="0.1"
          />
        </div>
      </div>
      <div className="game-list">
        {sortedAndFilteredBets.map((bet) => (
          <GameCard
            key={bet.pickId}
            bet={bet}
            openModal={openModal}
            bankroll={bankroll}
            kelly={kelly}
          />
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
