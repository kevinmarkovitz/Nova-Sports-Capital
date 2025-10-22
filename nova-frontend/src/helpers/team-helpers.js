// src/helpers/team-helpers.js
import { TEAM_LOGO_MAP } from "../mappings.js";

// --- NEW TEST LOG ---
console.log(
  "Direct lookup for 'miami heat' at module level:",
  TEAM_LOGO_MAP["miami heat"]
);
// --- END TEST LOG ---

const LEAGUE_FOLDER_MAP = {
  NFL: "nfl",
  NCAAF: "ncaaf",
  MLB: "mlb",
  NHL: "nhl",
  NBA: "nba",
  WNBA: "wnba",
};

export function getTeamLogoPath(teamName, sport) {
  // Ensure inputs are valid strings
  if (typeof teamName !== "string" || typeof sport !== "string") {
    console.warn("Invalid input to getTeamLogoPath:", teamName, sport);
    return `/images/team_logos/default-logo.png`;
  }

  const leagueFolder = LEAGUE_FOLDER_MAP[sport] || sport.toLowerCase();

  const simplifiedName = teamName
    .toLowerCase()
    .replace(/ \(.+\)/, "")
    .trim();

  const logoSlug = TEAM_LOGO_MAP[simplifiedName];

  // --- DEBUG LINE ADDED ---
  if (sport === "NBA") {
    console.log({
      originalTeamName: teamName,
      simplifiedName: simplifiedName,
      logoSlugFound: logoSlug,
    });
  }
  // --- END DEBUG LINE ---

  if (logoSlug) {
    const finalPath = `/images/team_logos/${leagueFolder}/${logoSlug}.png`;

    return finalPath;
  }

  return `/images/team_logos/default-logo.png`;
}
