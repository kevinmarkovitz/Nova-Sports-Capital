// src/components/EvBets.jsx
import { useState, useMemo } from "react";
import { americanToProb, americanToDecimal } from "../helpers/formatters.js";
import EvBetCard from "./EvBetCard";
import BookmakerFilter from "./BookmakerFilter"; // <-- IMPORT NEW COMPONENT

function EvBets({
  games,
  props,
  openModal,
  openTrackModal,
  bankroll,
  setBankroll,
  kelly,
  setKelly,
}) {
  const [filters, setFilters] = useState({
    minEv: 0.25,
    book: [], // <-- CHANGED from 'all' to an empty array
    market: "all",
    minOdds: "",
    maxOdds: "",
    search: "",
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // New handler for the multi-select bookmaker filter
  const handleBookFilterChange = (selectedBooks) => {
    setFilters((prev) => ({ ...prev, book: selectedBooks }));
  };

  const { evBets, availableBooks, availableMarkets } = useMemo(() => {
    const bets = [];
    const bookSet = new Set();
    const marketSet = new Set();

    const processBet = (bet) => {
      bets.push(bet);
      bookSet.add(bet.book.bookmaker);
      marketSet.add(bet.marketKey);
    };

    games.forEach((game) => {
      try {
        ["moneyline", "spreads", "totals"].forEach((marketKey) => {
          if (!game[marketKey]) return;
          game[marketKey].forEach((line) => {
            const consensus = line.evTabTrueOdds || line.trueOdds;
            if (!consensus || !line.bookmakerOdds) return;
            const trueProbA = americanToProb(consensus.oddsA);
            const trueProbB = americanToProb(consensus.oddsB);
            line.bookmakerOdds.forEach((book) => {
              if (book.vigOdds?.oddsA != null) {
                const evA =
                  trueProbA * americanToDecimal(book.vigOdds.oddsA) - 1;
                if (evA >= 0)
                  processBet({
                    type: "game",
                    data: game,
                    line,
                    book,
                    side: "A",
                    odds: book.vigOdds.oddsA,
                    ev: evA,
                    trueProb: trueProbA,
                    marketKey,
                  });
              }
              if (book.vigOdds?.oddsB != null) {
                const evB =
                  trueProbB * americanToDecimal(book.vigOdds.oddsB) - 1;
                if (evB >= 0)
                  processBet({
                    type: "game",
                    data: game,
                    line,
                    book,
                    side: "B",
                    odds: book.vigOdds.oddsB,
                    ev: evB,
                    trueProb: trueProbB,
                    marketKey,
                  });
              }
            });
          });
        });
      } catch (error) {
        console.error(`Error processing game ${game.id}:`, error, game);
      }
    });

    props.forEach((prop) => {
      try {
        const consensus = prop.evTabTrueOdds || prop.trueOdds;
        if (!consensus || !prop.bookmakerOdds) return;
        const trueProbOver = consensus.over
          ? americanToProb(consensus.over)
          : prop.trueProb || null;
        const trueProbUnder = consensus.under
          ? americanToProb(consensus.under)
          : null;
        prop.bookmakerOdds.forEach((book) => {
          const odds = book.vigOdds || book.odds;
          if (odds?.over != null && trueProbOver) {
            const evOver = trueProbOver * americanToDecimal(odds.over) - 1;
            if (evOver >= 0)
              processBet({
                type: "prop",
                data: prop,
                book,
                side: "Over",
                odds: odds.over,
                ev: evOver,
                trueProb: trueProbOver,
                marketKey: prop.market,
              });
          }
          if (odds?.under != null && trueProbUnder) {
            const evUnder = trueProbUnder * americanToDecimal(odds.under) - 1;
            if (evUnder >= 0)
              processBet({
                type: "prop",
                data: prop,
                book,
                side: "Under",
                odds: odds.under,
                ev: evUnder,
                trueProb: trueProbUnder,
                marketKey: prop.market,
              });
          }
        });
      } catch (error) {
        console.error(`Error processing prop ${prop.propId}:`, error, prop);
      }
    });

    const filteredBets = bets.filter((bet) => {
      const minEvFilter = (parseFloat(filters.minEv) || 0) / 100;
      if (bet.ev < minEvFilter) return false;

      const minOdds = parseFloat(filters.minOdds) || -Infinity;
      const maxOdds = parseFloat(filters.maxOdds) || Infinity;
      const searchTerm = filters.search.toLowerCase();

      // --- UPDATED BOOKMAKER FILTER LOGIC ---
      if (
        filters.book.length > 0 &&
        !filters.book.includes(bet.book.bookmaker)
      ) {
        return false;
      }
      // ------------------------------------

      if (filters.market !== "all" && bet.marketKey !== filters.market)
        return false;
      if (bet.odds < minOdds || bet.odds > maxOdds) return false;

      if (searchTerm) {
        const teamA = bet.data.teamA.toLowerCase();
        const teamB = bet.data.teamB.toLowerCase();
        const player = (bet.data.player || "").toLowerCase();
        if (
          !teamA.includes(searchTerm) &&
          !teamB.includes(searchTerm) &&
          !player.includes(searchTerm)
        ) {
          return false;
        }
      }
      return true;
    });

    return {
      evBets: filteredBets.sort((a, b) => b.ev - a.ev),
      availableBooks: [...bookSet].sort(),
      availableMarkets: [...marketSet].sort(),
    };
  }, [games, props, filters]);

  return (
    <div className="view-container">
      <h2>+EV Bets</h2>
      <div className="filters ev-filters">
        <div className="filter-group">
          <label htmlFor="ev-search">Search:</label>
          <input
            id="ev-search"
            name="search"
            type="text"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Team/Player..."
          />
        </div>
        <div className="filter-group">
          <label htmlFor="ev-minEv">Min EV (%):</label>
          <input
            id="ev-minEv"
            name="minEv"
            type="number"
            value={filters.minEv}
            onChange={handleFilterChange}
            step="0.25"
          />
        </div>

        {/* --- REPLACE THE OLD SELECT WITH THE NEW COMPONENT --- */}
        <BookmakerFilter
          availableBooks={availableBooks}
          selectedBooks={filters.book}
          onChange={handleBookFilterChange}
        />

        <div className="filter-group">
          <label htmlFor="ev-market">Market:</label>
          <select
            id="ev-market"
            name="market"
            value={filters.market}
            onChange={handleFilterChange}
          >
            <option value="all">All Markets</option>
            {availableMarkets.map((market) => (
              <option key={market} value={market}>
                {market.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="ev-minOdds">Min Odds:</label>
          <input
            id="ev-minOdds"
            name="minOdds"
            type="number"
            value={filters.minOdds}
            onChange={handleFilterChange}
            placeholder="-200"
          />
        </div>
        <div className="filter-group">
          <label htmlFor="ev-maxOdds">Max Odds:</label>
          <input
            id="ev-maxOdds"
            name="maxOdds"
            type="number"
            value={filters.maxOdds}
            onChange={handleFilterChange}
            placeholder="+200"
          />
        </div>

        <div className="filter-group global-input ml-auto">
          <label htmlFor="ev-bankroll">Bankroll:</label>
          <input
            id="ev-bankroll"
            type="number"
            value={bankroll}
            onChange={(e) => setBankroll(e.target.value)}
            placeholder="$10000"
          />
        </div>
        <div className="filter-group global-input">
          <label htmlFor="ev-kelly">Kelly Multiplier:</label>
          <input
            id="ev-kelly"
            type="number"
            value={kelly}
            onChange={(e) => setKelly(e.target.value)}
            placeholder="0.5"
            step="0.1"
          />
        </div>
      </div>
      <div className="ev-bets-list">
        {evBets.length > 0 ? (
          evBets.map((bet, index) => (
            <EvBetCard
              key={index}
              bet={bet}
              openModal={openModal}
              openTrackModal={openTrackModal}
              bankroll={bankroll}
              kelly={kelly}
            />
          ))
        ) : (
          <p className="status-message">
            No +EV bets found matching your criteria.
          </p>
        )}
      </div>
    </div>
  );
}

export default EvBets;
