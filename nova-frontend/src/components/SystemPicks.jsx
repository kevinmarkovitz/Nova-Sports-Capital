// src/components/SystemPicks.jsx
import { useMemo } from "react";
import { americanToProb, americanToDecimal } from "../helpers/formatters.js";
import SystemPickCard from "./SystemPickCard";

const MIN_EDGE_THRESHOLD = 0.0025; // 0.25%

function SystemPicks({ games, props }) {
  const systemPicks = useMemo(() => {
    const picks = [];

    // Process Game Lines
    games.forEach((game) => {
      ["moneyline", "spreads", "totals"].forEach((marketKey) => {
        if (!game[marketKey]) return;
        game[marketKey].forEach((line) => {
          if (!line.trueOdds || !line.trueMarketOdds || !line.bookmakerOdds)
            return;

          const trueProbA = americanToProb(line.trueOdds.oddsA);
          const marketProbA = americanToProb(line.trueMarketOdds.oddsA);
          const edgeA = trueProbA - marketProbA;

          if (edgeA >= MIN_EDGE_THRESHOLD) {
            let bestBet = { price: -Infinity, book: null };
            line.bookmakerOdds.forEach((book) => {
              if (
                book.vigOdds?.oddsA != null &&
                book.vigOdds.oddsA > bestBet.price
              ) {
                bestBet = { price: book.vigOdds.oddsA, book };
              }
            });
            if (bestBet.book) {
              picks.push({
                ...bestBet,
                edge: edgeA,
                side: "A",
                data: game,
                line,
                marketKey,
                id: `${game.id}-${marketKey}-${line.point}-A`,
              });
            }
          }

          const trueProbB = americanToProb(line.trueOdds.oddsB);
          const marketProbB = americanToProb(line.trueMarketOdds.oddsB);
          const edgeB = trueProbB - marketProbB;

          if (edgeB >= MIN_EDGE_THRESHOLD) {
            let bestBet = { price: -Infinity, book: null };
            line.bookmakerOdds.forEach((book) => {
              if (
                book.vigOdds?.oddsB != null &&
                book.vigOdds.oddsB > bestBet.price
              ) {
                bestBet = { price: book.vigOdds.oddsB, book };
              }
            });
            if (bestBet.book) {
              picks.push({
                ...bestBet,
                edge: edgeB,
                side: "B",
                data: game,
                line,
                marketKey,
                id: `${game.id}-${marketKey}-${line.point}-B`,
              });
            }
          }
        });
      });
    });

    // We can add props logic here later if needed

    return picks.sort(
      (a, b) => new Date(b.data.gameTime) - new Date(a.data.gameTime)
    );
  }, [games, props]);

  return (
    <div className="view-container">
      <h2>System Picks Log</h2>
      <div className="system-picks-list">
        {systemPicks.length > 0 ? (
          systemPicks.map((pick) => (
            <SystemPickCard key={pick.id} pick={pick} />
          ))
        ) : (
          <p>
            No system picks found meeting the >{MIN_EDGE_THRESHOLD * 100}% edge
            threshold.
          </p>
        )}
      </div>
    </div>
  );
}

export default SystemPicks;
