// src/components/EvBetCard.jsx
import { getTeamLogoPath } from "../helpers/team-helpers.js";
import {
  formatPoint,
  formatOdds,
  americanToDecimal,
  americanToProb,
} from "../helpers/formatters.js";

function EvBetCard({ bet, openModal, openTrackModal, bankroll, kelly }) {
  const { ev, odds, book, side, marketKey, data, line, trueProb } = bet;
  const logoSrc = `/images/logos/${book.bookmaker}.png`;

  let betName, gameName;

  if (bet.type === "prop") {
    const propMarketName = marketKey
      .replace("player_", "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    gameName = `${data.teamB} @ ${data.teamA}`;
    betName =
      data.point !== null
        ? `${side} ${data.point} ${propMarketName}`
        : propMarketName;
  } else {
    gameName = `${data.teamB} @ ${data.teamA}`;
    if (marketKey === "moneyline") {
      betName = side === "A" ? data.teamA : data.teamB;
    } else if (marketKey === "spreads") {
      const point = side === "A" ? line.point : -line.point;
      betName = `${side === "A" ? data.teamA : data.teamB} ${formatPoint(
        point
      )}`;
    } else {
      betName = `${side === "A" ? "Over" : "Under"} ${line.point}`;
    }
  }

  // --- KELLY CALCULATION LOGIC ---
  const kellyMultiplier = parseFloat(kelly) || 0.5;
  const currentBankroll = parseFloat(bankroll) || 0;
  let stakeAmount = 0;
  let stakePercentText = "0.00%";

  if (currentBankroll > 0 && trueProb) {
    const b = americanToDecimal(odds) - 1;
    const p = trueProb;
    const q = 1 - p;

    if (b > 0) {
      let kellyFraction = (b * p - q) / b;
      if (kellyFraction > 0) {
        stakeAmount = currentBankroll * kellyFraction * kellyMultiplier;
        stakePercentText = `${(kellyFraction * kellyMultiplier * 100).toFixed(
          2
        )}%`;
      }
    }
  }

  const handleTrackClick = (e) => {
    e.stopPropagation();
    openTrackModal({
      game: gameName,
      bet: betName,
      odds: odds,
      bookmaker: book.bookmaker,
      stake: stakeAmount, // Use calculated stake
      gameTime: data.gameTime,
    });
  };

  return (
    <div
      className="ev-bet-card"
      onClick={() =>
        openModal({
          item: data,
          lineData: bet.type === "prop" ? data : line,
          marketType: marketKey,
          isProp: bet.type === "prop",
        })
      }
    >
      <div className="ev-card-header">
        <div className="flex-grow">
          <p className="font-bold text-lg text-main-primary">
            {bet.type === "prop" ? data.player : gameName}
          </p>
        </div>
        <div className="ev-card-odds-info">
          <div>
            <p className="font-semibold text-main-primary">
              {formatOdds(odds)}
            </p>
            <p className="text-sm text-main-secondary">{book.bookmaker}</p>
          </div>
          <img
            src={logoSrc}
            alt={book.bookmaker}
            className="ev-card-book-logo"
          />
        </div>
      </div>
      <div className="ev-card-body">
        <p className="font-bold text-lg text-accent-blue">{betName}</p>
        <div className="flex items-center gap-4">
          <div className="ev-badge">
            <p>+{(ev * 100).toFixed(2)}% EV</p>
          </div>
          {/* --- STAKE DISPLAY --- */}
          {stakeAmount > 0 && (
            <div className="rec-stake">
              <div className="stake-amount">$ {stakeAmount.toFixed(2)}</div>
              <div className="stake-label">{stakePercentText}</div>
            </div>
          )}
          <button
            onClick={handleTrackClick}
            className="track-button"
            title="Track Bet"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export default EvBetCard;
