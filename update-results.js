const axios = require("axios");
const fs = require("fs");

// --- Configuration ---
const ODDS_API_KEY = "ed63bd22ecf8ad019b69608e25b5c9c3"; // IMPORTANT: Add your API key
const PICKS_FILE_PATH = "system_picks.json";
const DAYS_TO_LOOK_BACK = 3; // How many past days to fetch scores from

// --- FIX: Added a map for correct API sport keys ---
const SPORT_KEY_MAP = {
  NFL: "americanfootball_nfl",
  NCAAF: "americanfootball_ncaaf",
  MLB: "baseball_mlb",
  NHL: "icehockey_nhl",
  NBA: "basketball_nba",
  WNBA: "basketball_wnba",
  // Add any other sports you track here
};

// --- Helper Functions ---

/**
 * Calculates Profit/Loss for a given wager and American odds.
 * @param {number} wager The amount wagered.
 * @param {number} odds The American odds for the bet.
 * @param {'WIN' | 'LOSS' | 'PUSH'} result The outcome of the bet.
 * @returns {number} The calculated profit or loss.
 */
const calculatePnL = (wager, odds, result) => {
  if (result === "LOSS") {
    return -parseFloat(wager);
  }
  if (result === "PUSH") {
    return 0;
  }
  if (result === "WIN") {
    if (odds >= 100) {
      return parseFloat(wager) * (odds / 100);
    } else {
      return parseFloat(wager) * (100 / Math.abs(odds));
    }
  }
  return 0; // Default case
};

/**
 * Grades a single pick based on the final score data.
 * @param {object} pick The pick object from system_picks.json.
 * @param {object} scoreData The score object from The Odds API.
 * @returns {'WIN' | 'LOSS' | 'PUSH' | null} The graded result.
 */
const gradePick = (pick, scoreData) => {
  const homeScoreStr = scoreData.scores.find(
    (s) => s.name === pick.teamA
  )?.score;
  const awayScoreStr = scoreData.scores.find(
    (s) => s.name === pick.teamB
  )?.score;

  if (!homeScoreStr || !awayScoreStr) return null; // Scores not found

  const homeScore = parseFloat(homeScoreStr);
  const awayScore = parseFloat(awayScoreStr);

  if (isNaN(homeScore) || isNaN(awayScore)) return null;

  switch (pick.marketKey) {
    case "moneyline":
      if (homeScore === awayScore) return "PUSH"; // Handle ties for sports where this is possible
      const winner = homeScore > awayScore ? pick.teamA : pick.teamB;
      const pickedTeam = pick.side === "A" ? pick.teamA : pick.teamB;
      return winner === pickedTeam ? "WIN" : "LOSS";

    case "spreads":
      const pickedSideScore = pick.side === "A" ? homeScore : awayScore;
      const otherSideScore = pick.side === "A" ? awayScore : homeScore;
      if (pickedSideScore + pick.point === otherSideScore) return "PUSH";
      return pickedSideScore + pick.point > otherSideScore ? "WIN" : "LOSS";

    case "totals":
      const totalScore = homeScore + awayScore;
      if (totalScore === pick.point) return "PUSH";
      // Side 'A' is Over, Side 'B' is Under
      const isOver = pick.side === "A";
      if (isOver) {
        return totalScore > pick.point ? "WIN" : "LOSS";
      } else {
        return totalScore < pick.point ? "WIN" : "LOSS";
      }

    default:
      return null;
  }
};

// --- Main Logic ---

async function updateResults() {
  console.log("Starting results update process...");

  // 1. Read the picks file
  let picks;
  try {
    const fileContent = fs.readFileSync(PICKS_FILE_PATH, "utf-8");
    picks = JSON.parse(fileContent);
  } catch (e) {
    console.error(`Error reading or parsing ${PICKS_FILE_PATH}:`, e.message);
    return;
  }

  // 2. Find pending picks that should be completed
  const now = new Date();
  const pendingPicks = picks.filter(
    (p) => p.result === null && new Date(p.gameTime) < now
  );

  if (pendingPicks.length === 0) {
    console.log("No pending picks to update.");
    return;
  }
  console.log(`Found ${pendingPicks.length} pending picks to check.`);

  // 3. Get unique sport keys using the new map
  const sportKeys = [
    ...new Set(
      pendingPicks
        .map((p) => SPORT_KEY_MAP[p.sport]) // Use the map here
        .filter((key) => key) // Filter out any sports not in our map
    ),
  ];

  if (sportKeys.length === 0) {
    console.log(
      "No pending picks for sports defined in SPORT_KEY_MAP. Please check your map."
    );
    return;
  }

  // 4. Fetch scores from the API
  const scoresMap = new Map();
  console.log(`Fetching scores for sports: ${sportKeys.join(", ")}`);
  for (const sport of sportKeys) {
    try {
      const response = await axios.get(
        `https://api.the-odds-api.com/v4/sports/${sport}/scores/`,
        {
          params: {
            apiKey: ODDS_API_KEY,
            daysFrom: DAYS_TO_LOOK_BACK,
          },
        }
      );
      response.data.forEach((game) => {
        if (game.completed) {
          scoresMap.set(game.id, game);
        }
      });
    } catch (error) {
      console.error(
        `Failed to fetch scores for ${sport}:`,
        error.response ? error.response.data.message : error.message
      );
    }
  }

  if (scoresMap.size === 0) {
    console.log(
      "No completed game scores were found from the API for the relevant games."
    );
    return;
  }

  // 5. Grade picks and update the main picks array
  let updatedCount = 0;
  picks.forEach((pick) => {
    // Only grade picks that are pending and have a score available
    if (pick.result === null && scoresMap.has(pick.gameId)) {
      const scoreData = scoresMap.get(pick.gameId);
      const result = gradePick(pick, scoreData);

      if (result) {
        pick.result = result;
        // Calculate P/L for each wager type
        pick.pnl_full = calculatePnL(pick.wager_full, pick.odds, result);
        pick.pnl_half = calculatePnL(pick.wager_half, pick.odds, result);
        pick.pnl_quarter = calculatePnL(pick.wager_quarter, pick.odds, result);

        // Check if dynamic wager fields exist before calculating PnL
        if (pick.wager_full_dynamic) {
          pick.pnl_full_dynamic = calculatePnL(
            pick.wager_full_dynamic,
            pick.odds,
            result
          );
          pick.pnl_half_dynamic = calculatePnL(
            pick.wager_half_dynamic,
            pick.odds,
            result
          );
          pick.pnl_quarter_dynamic = calculatePnL(
            pick.wager_quarter_dynamic,
            pick.odds,
            result
          );
        }
        updatedCount++;
      }
    }
  });

  // 6. Write the updated data back to the file
  if (updatedCount > 0) {
    fs.writeFileSync(PICKS_FILE_PATH, JSON.stringify(picks, null, 2));
    // Rounding to 2 decimal places as you've previously requested for financial results.
    const totalPnlStatic = picks.reduce((sum, p) => sum + (p.pnl_full || 0), 0);
    const totalPnlDynamic = picks.reduce(
      (sum, p) => sum + (p.pnl_full_dynamic || 0),
      0
    );

    console.log(`\nSuccessfully updated ${updatedCount} picks.`);
    console.log(`Current Total Static P/L: $${totalPnlStatic.toFixed(2)}`);

    if (
      totalPnlDynamic !== 0 ||
      picks.some((p) => p.pnl_full_dynamic !== undefined)
    ) {
      console.log(`Current Total Dynamic P/L: $${totalPnlDynamic.toFixed(2)}`);
    }
  } else {
    console.log(
      "\nNo picks were updated. Scores for pending games may not be available yet."
    );
  }
}

updateResults();
