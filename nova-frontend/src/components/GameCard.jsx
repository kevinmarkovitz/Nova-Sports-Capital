// src/components/GameCard.jsx
import { getTeamLogoPath } from "../helpers/team-helpers.js";
import { formatPoint, americanToProb } from "../helpers/formatters.js";

function americanToDecimal(odds) {
  if (odds >= 100) return odds / 100 + 1;
  return 100 / Math.abs(odds) + 1;
}

function GameCard({ bet, openModal, bankroll, kelly }) {
  const { game, line, marketType, side, edge, historicalPick } = bet;
  const logoA = getTeamLogoPath(game.teamA, game.sport);
  const logoB = getTeamLogoPath(game.teamB, game.sport);

  const handleCardClick = () => {
    openModal({
      item: game,
      lineData: line,
      marketType: marketType,
      isProp: false,
    });
  };

  const renderRecommendation = () => {
    let sideName, teamLogo;

    if (marketType === "moneyline") {
      sideName = side === "A" ? game.teamA : game.teamB;
      teamLogo = side === "A" ? logoA : logoB;
    } else if (marketType === "spreads") {
      const point = side === "A" ? line.point : -line.point;
      sideName = `${side === "A" ? game.teamA : game.teamB} ${formatPoint(
        point
      )}`;
      teamLogo = side === "A" ? logoA : logoB;
    } else {
      // Totals
      sideName = side === "A" ? `Over ${line.point}` : `Under ${line.point}`;
      teamLogo = null;
    }

    const kellyMultiplier = parseFloat(kelly) || 0.5;
    const currentBankroll = parseFloat(bankroll) || 10000;
    let stakeAmount = 0;
    let stakePercentText = "0.00%";

    if (currentBankroll > 0) {
      const trueProb = americanToProb(
        side === "A" ? line.trueOdds.oddsA : line.trueOdds.oddsB
      );
      const marketOddsValue =
        side === "A" ? line.trueMarketOdds.oddsA : line.trueMarketOdds.oddsB;

      if (marketOddsValue != null) {
        const b = americanToDecimal(marketOddsValue) - 1;
        const q = 1 - trueProb;
        if (b > 0) {
          let kellyFraction = (b * trueProb - q) / b;
          if (kellyFraction > 0) {
            stakeAmount = currentBankroll * kellyFraction * kellyMultiplier;
            stakePercentText = `${(
              kellyFraction *
              kellyMultiplier *
              100
            ).toFixed(2)}%`;
          }
        }
      }
    }

    // Determine historical pick display name
    let historicalPickDisplayName = "";
    if (historicalPick) {
      const {
        side: histSide,
        marketKey: histMarket,
        point: histPoint,
      } = historicalPick;
      if (histMarket === "moneyline") {
        historicalPickDisplayName = histSide === "A" ? game.teamA : game.teamB;
      } else if (histMarket === "spreads") {
        const point = histPoint; // Already the correct display point
        const teamName = histSide === "A" ? game.teamA : game.teamB;
        historicalPickDisplayName = `${teamName} ${formatPoint(point)}`;
      } else {
        // Totals
        const sideName = histSide === "A" ? "Over" : "Under";
        historicalPickDisplayName = `${sideName} ${histPoint}`;
      }
    }

    return (
      <div className="recommendation">
        {teamLogo && (
          <img src={teamLogo} alt="team logo" className="rec-logo" />
        )}
        <div className="rec-details">
          <div className="rec-bet-name">{sideName}</div>
          <div className="rec-edge">
            <span>+{(edge * 100).toFixed(2)}% Edge</span>
          </div>
          {historicalPick && (
            <div className="max-edge-display">
              <span className="max-edge-label">Peak Edge: </span>
              <span className="max-edge-pick">
                {historicalPickDisplayName}{" "}
              </span>
              <span className="max-edge-value">
                (+{(historicalPick.edge * 100).toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
        <div className="rec-stake">
          <div className="stake-amount">$ {stakeAmount.toFixed(2)}</div>
          <div className="stake-label">{stakePercentText}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="game-card" onClick={handleCardClick}>
      {/* Removed renderMaxEdgeBadge() here */}
      <div className="game-info">
        <span>{game.sport}</span>
        <span>
          {new Date(game.gameTime).toLocaleDateString()}
          {" @ "}
          {new Date(game.gameTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <div className="team">
        <img src={logoB} alt={game.teamB} className="team-logo" />
        <span className="team-name">{game.teamB}</span>
      </div>
      <div className="team">
        <img src={logoA} alt={game.teamA} className="team-logo" />
        <span className="team-name">@ {game.teamA}</span>
      </div>

      {renderRecommendation()}
    </div>
  );
}

export default GameCard;
