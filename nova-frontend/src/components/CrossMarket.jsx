// src/components/CrossMarket.jsx
import { useMemo } from "react";
import { americanToProb } from "../helpers/formatters.js";
import CrossMarketBetCard from "./CrossMarketBetCard";

function CrossMarket({ games, props }) {
  const crossMarketBets = useMemo(() => {
    const bets = [];

    const processMarket = (item, marketKey, lineOrProp) => {
      if (!lineOrProp.bookmakerOdds || lineOrProp.bookmakerOdds.length < 2)
        return;

      let bestA = { odds: -Infinity, bookmaker: null, type: null, side: "A" };
      let bestB = { odds: -Infinity, bookmaker: null, type: null, side: "B" };

      lineOrProp.bookmakerOdds.forEach((book) => {
        const odds = book.vigOdds || book.odds;
        const oddsA = odds?.oddsA ?? odds?.over;
        const oddsB = odds?.oddsB ?? odds?.under;

        if (oddsA != null && oddsA > bestA.odds) {
          bestA = {
            odds: oddsA,
            bookmaker: book.bookmaker,
            type: book.type,
            side: "A",
          };
        }
        if (oddsB != null && oddsB > bestB.odds) {
          bestB = {
            odds: oddsB,
            bookmaker: book.bookmaker,
            type: book.type,
            side: "B",
          };
        }
      });

      const probA = americanToProb(bestA.odds);
      const probB = americanToProb(bestB.odds);
      const isArb = probA + probB < 1 && probA > 0 && probB > 0;
      const isCrossMarket = bestA.type !== bestB.type;

      if (isArb && isCrossMarket) {
        const arbPercent = 1 - (probA + probB);
        bets.push({
          type: item.player ? "prop" : "game",
          data: item,
          line: item.player ? null : lineOrProp,
          softSide: bestA.type === "sharp" ? bestB : bestA,
          sharpSide: bestA.type === "sharp" ? bestA : bestB,
          arbPercent,
          marketKey,
        });
      }
    };

    // Process Game Lines
    games.forEach((game) => {
      ["moneyline", "spreads", "totals"].forEach((marketKey) => {
        if (!game[marketKey]) return;
        game[marketKey].forEach((line) => {
          processMarket(game, marketKey, line);
        });
      });
    });

    // Process Player Props
    props.forEach((prop) => {
      processMarket(prop, prop.market, prop);
    });

    return bets.sort((a, b) => b.arbPercent - a.arbPercent);
  }, [games, props]);

  return (
    <div className="view-container">
      <h2>Cross-Market Arbitrage</h2>
      <div className="cross-market-list">
        {crossMarketBets.length > 0 ? (
          crossMarketBets.map((bet, index) => (
            <CrossMarketBetCard key={index} bet={bet} />
          ))
        ) : (
          <p>No cross-market arbitrage opportunities found.</p>
        )}
      </div>
    </div>
  );
}

export default CrossMarket;
