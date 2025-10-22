// src/components/CrossMarketBetCard.jsx
import { getTeamLogoPath } from "../helpers/team-helpers.js";
import { formatPoint, formatOdds } from "../helpers/formatters.js";

function CrossMarketBetCard({ bet }) {
  const { softSide, sharpSide, data, line, marketKey } = bet;

  const softLogoSrc = `/images/logos/${softSide.bookmaker}.png`;
  const sharpLogoSrc = `/images/logos/${sharpSide.bookmaker}.png`;

  let betDescription;
  if (bet.type === "prop") {
    betDescription = `${data.player} - ${softSide.side} ${data.point}`;
  } else {
    // Game line
    if (marketKey === "moneyline") {
      betDescription = softSide.side === "A" ? data.teamA : data.teamB;
    } else if (marketKey === "spreads") {
      const point = softSide.side === "A" ? line.point : -line.point;
      betDescription = `${
        softSide.side === "A" ? data.teamA : data.teamB
      } ${formatPoint(point)}`;
    } else {
      // Totals
      betDescription = `${softSide.side === "A" ? "Over" : "Under"} ${
        line.point
      }`;
    }
  }

  return (
    <div className="cross-market-card">
      <div className="cm-bet-description">{betDescription}</div>
      <div className="cm-leg">
        <span className="cm-leg-label">Bet At Soft Book</span>
        <div className="cm-book-info">
          <img
            src={softLogoSrc}
            alt={softSide.bookmaker}
            className="cm-book-logo"
          />
          <span className="cm-odds">{formatOdds(softSide.odds)}</span>
        </div>
      </div>
      <div className="cm-leg">
        <span className="cm-leg-label">Hedge At Sharp Book</span>
        <div className="cm-book-info">
          <img
            src={sharpLogoSrc}
            alt={sharpSide.bookmaker}
            className="cm-book-logo"
          />
          <span className="cm-odds">{formatOdds(sharpSide.odds)}</span>
        </div>
      </div>
      <div className="cm-arb-value">
        +{(bet.arbPercent * 100).toFixed(2)}% Arb
      </div>
    </div>
  );
}

export default CrossMarketBetCard;
