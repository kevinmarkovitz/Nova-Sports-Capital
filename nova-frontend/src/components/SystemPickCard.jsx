// src/components/SystemPickCard.jsx
import { getTeamLogoPath } from "../helpers/team-helpers.js";
import { formatPoint, formatOdds } from "../helpers/formatters.js";

function SystemPickCard({ pick }) {
  const { sport, marketKey, teamA, teamB, side, line, odds, edge } = pick;

  let sideName, teamLogo;
  if (marketKey === "moneyline") {
    sideName = side === "A" ? teamA : teamB;
    teamLogo =
      side === "A"
        ? getTeamLogoPath(teamA, sport)
        : getTeamLogoPath(teamB, sport);
  } else if (marketKey === "spreads") {
    const point = side === "A" ? line.point : -line.point;
    sideName = `${side === "A" ? teamA : teamB} ${formatPoint(point)}`;
    teamLogo =
      side === "A"
        ? getTeamLogoPath(teamA, sport)
        : getTeamLogoPath(teamB, sport);
  } else {
    // Totals
    sideName = `${side === "A" ? "Over" : "Under"} ${line.point}`;
    teamLogo = null;
  }

  return (
    <div className="system-pick-card">
      <div className="sp-header">
        <span>{sport}</span>
        <span>{new Date(pick.data.gameTime).toLocaleDateString()}</span>
      </div>
      <div className="sp-body">
        {teamLogo && <img src={teamLogo} alt="team" className="sp-logo" />}
        <div className="sp-details">
          <p className="sp-teams">
            {teamB} @ {teamA}
          </p>
          <p className="sp-bet-name">{sideName}</p>
        </div>
        <div className="sp-odds-box">
          <p className="sp-odds">{formatOdds(odds)}</p>
          <p className="sp-bookmaker">{pick.book.bookmaker}</p>
        </div>
      </div>
      <div className="sp-footer">
        <span>+{(edge * 100).toFixed(2)}% EV</span>
      </div>
    </div>
  );
}

export default SystemPickCard;
