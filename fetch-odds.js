const axios = require("axios");
const fs = require("fs");

// --- Configuration ---
const ODDS_API_KEY = "ed63bd22ecf8ad019b69608e25b5c9c3";
const REGIONS = "us,us2,eu,au,us_ex";
const ODDS_FORMAT = "american";
const REQUEST_DELAY = 1000;
const FETCH_DAYS_AHEAD = 1;
const ALT_LINE_RANGE_LIMIT = 0.5; // For spreads and totals, limit alt lines to this range from main line
const MIN_ODDS_LIMIT = -1999;
const MAX_ODDS_LIMIT = 1999;
const PREFILTER_MIN_ODDS = null; // Example: Ignores games with odds below.
const PREFILTER_MAX_ODDS = null; // Example: Ignores games with odds above.
const MIN_EDGE_THRESHOLD_FOR_LOGGING = 0.0001; // Backtesting: Only log system picks with an edge > .01%
const BACKTEST_BANKROLL = 10000;
const MIN_BOOKS_FOR_CONSENSUS = 5;
const BOOKS_TO_EXCLUDE_FROM_BEST_ODDS = ["unibet_uk", "betway", "onexbet"];
const ONE_WAY_PROP_MARKETS = [
  // --- Existing props ---
  "player_anytime_td",
  "player_1st_td",
  "player_last_td",
  "batter_home_runs",
  "batter_first_home_run",
  "pitcher_record_a_win",
  "player_goal_scorer_first",
  "player_goal_scorer_last",
  "player_goal_scorer_anytime",
  // --- NEW NBA one-way props ---
  "player_first_basket",
  "player_first_team_basket",
  "player_double_double",
  "player_triple_double",
  "player_method_of_first_basket",
];

const MARKET_DEFINITIONS = {
  gameLines: ["h2h", "spreads", "totals"],
  alternateLines: ["alternate_spreads", "alternate_totals"],

  // --- American Football Props ---
  footballPassingProps: [
    "player_pass_yds",
    "player_pass_tds",
    "player_pass_attempts",
    "player_pass_completions",
    "player_pass_interceptions",
    "player_pass_longest_completion",
  ],
  footballRushingProps: [
    "player_rush_yds",
    "player_rush_attempts",
    "player_rush_longest",
  ],
  footballReceivingProps: [
    "player_reception_yds", // REVERTED: This is the correct key
    "player_receptions",
    "player_reception_longest",
  ],
  footballComboProps: [
    "player_pass_rush_yds",
    "player_rush_reception_yds",
    "player_pass_rush_reception_yds",
  ],
  footballTdScorerProps: [
    "player_pass_tds",
    "player_rush_tds",
    "player_reception_tds",
    "player_pass_rush_reception_tds",
    "player_rush_reception_tds",
  ],
  footballKickingProps: [
    "player_kicking_points",
    "player_field_goals",
    "player_pats",
  ],
  footballDefensiveProps: [
    "player_tackles_assists",
    "player_solo_tackles",
    "player_sacks",
    "player_defensive_interceptions",
  ],
  footballOneWayProps: [
    "player_anytime_td",
    // "player_1st_td", "player_last_td"
  ],

  // --- Alternate American Football Props ---
  footballAlternatePassingProps: [
    "player_pass_yds_alternate",
    "player_pass_tds_alternate",
    "player_pass_attempts_alternate",
    "player_pass_completions_alternate",
    "player_pass_interceptions_alternate",
    "player_pass_longest_completion_alternate",
  ],
  footballAlternateRushingProps: [
    "player_rush_yds_alternate",
    "player_rush_attempts_alternate",
    "player_rush_longest_alternate",
  ],
  footballAlternateReceivingProps: [
    "player_reception_yds_alternate", // REVERTED: This is the correct key
    "player_receptions_alternate",
    "player_reception_longest_alternate",
  ],
  footballAlternateComboProps: [
    "player_pass_rush_yds_alternate",
    "player_rush_reception_yds_alternate",
    "player_pass_rush_reception_yds_alternate",
  ],
  footballAlternateKickingProps: [
    "player_kicking_points_alternate",
    "player_field_goals_alternate",
    "player_pats_alternate",
  ],
  footballAlternateDefensiveProps: [
    "player_tackles_assists_alternate",
    "player_solo_tackles_alternate",
    "player_sacks_alternate",
  ],

  // --- NBA Player Props ---
  nbaPlayerProps: [
    "player_points",
    "player_points_q1",
    "player_rebounds",
    "player_rebounds_q1",
    "player_assists",
    "player_assists_q1",
    "player_threes",
    "player_blocks",
    "player_steals",
    "player_blocks_steals",
    "player_turnovers",
    "player_points_rebounds_assists",
    "player_points_rebounds",
    "player_points_assists",
    "player_rebounds_assists",
    "player_field_goals",
    "player_frees_made",
    "player_frees_attempts",
  ],

  // --- NEW Alternate NBA Player Props ---
  nbaAlternatePlayerProps: [
    "player_points_alternate",
    "player_rebounds_alternate",
    "player_assists_alternate",
    "player_blocks_alternate",
    "player_steals_alternate",
    "player_turnovers_alternate",
    "player_threes_alternate",
    "player_points_assists_alternate",
    "player_points_rebounds_alternate",
    "player_rebounds_assists_alternate",
    "player_points_rebounds_assists_alternate",
  ],

  // --- NEW One-Way NBA Player Props ---
  nbaOneWayPlayerProps: [
    "player_first_basket",
    "player_first_team_basket",
    "player_double_double",
    "player_triple_double",
    "player_method_of_first_basket",
  ],
  // --- WNBA Player Props ---
  wnbaPlayerProps: [
    "player_points",
    "player_rebounds",
    "player_assists",
    "player_threes",
  ],
  // --- MLB Player Props ---
  mlbBattingProps: [
    "batter_home_runs",
    "batter_hits",
    "batter_total_bases",
    "batter_rbis",
    "batter_runs_scored",
    "batter_hits_runs_rbis",
    "batter_singles",
    "batter_doubles",
    // "batter_triples",
    // "batter_walks",
    // "batter_strikeouts",
    // "batter_stolen_bases",
  ],
  mlbPitchingProps: [
    "pitcher_strikeouts",
    "pitcher_hits_allowed",
    "pitcher_walks",
    "pitcher_earned_runs",
    "pitcher_outs",
  ],
  mlbOneWayProps: ["batter_first_home_run", "pitcher_record_a_win"],
  mlbAlternateBattingProps: [
    "batter_total_bases_alternate",
    "batter_home_runs_alternate",
    "batter_hits_alternate",
    "batter_rbis_alternate",
    "batter_walks_alternate",
    "batter_strikeouts_alternate",
    "batter_runs_scored_alternate",
    "batter_singles_alternate",
    "batter_doubles_alternate",
    "batter_triples_alternate",
  ],
  mlbAlternatePitchingProps: [
    "pitcher_hits_allowed_alternate",
    "pitcher_walks_alternate",
    "pitcher_strikeouts_alternate",
  ],

  //  NHL Player Props ---
  nhlPlayerProps: [
    "player_points",
    "player_power_play_points",
    "player_assists",
    "player_blocked_shots",
    "player_shots_on_goal",
    "player_goals",
    "player_total_saves",
  ],
  nhlAlternatePlayerProps: [
    "player_points_alternate",
    "player_assists_alternate",
    "player_power_play_points_alternate",
    "player_goals_alternate",
    "player_shots_on_goal_alternate",
    "player_blocked_shots_alternate",
    "player_total_saves_alternate",
  ],
  nhlOneWayProps: [
    "player_goal_scorer_first",
    "player_goal_scorer_last",
    "player_goal_scorer_anytime",
  ],
};

const SPORT_CONFIG = {
  americanfootball_nfl: {
    markets: [
      "gameLines",
      "alternateLines",
      "footballPassingProps",
      "footballRushingProps",
      "footballReceivingProps",
      "footballComboProps",
      "footballTdScorerProps",
      "footballKickingProps",
      "footballDefensiveProps",
      "footballOneWayProps",
      "footballAlternatePassingProps",
      "footballAlternateRushingProps",
      "footballAlternateReceivingProps",
      "footballAlternateComboProps",
      "footballAlternateKickingProps",
      "footballAlternateDefensiveProps",
    ],
  },
  americanfootball_ncaaf: {
    markets: ["gameLines", "alternateLines"],
  },
  icehockey_nhl: {
    markets: [
      "gameLines",
      // "alternateLines",
      // "nhlPlayerProps",
      // "nhlAlternatePlayerProps",
      // "nhlOneWayProps",
    ],
  },
  baseball_mlb: {
    markets: [
      "gameLines",
      // "mlbBattingProps",
      // "mlbPitchingProps",
      // "mlbOneWayProps",
      // "mlbAlternateBattingProps",
      // "mlbAlternatePitchingProps",
    ],
  },
  basketball_nba: {
    markets: [
      "gameLines",
      "alternateLines",
      // "nbaPlayerProps",
      // "nbaAlternatePlayerProps",
      // "nbaOneWayPlayerProps",
    ],
  },
  // basketball_wnba: {
  //   markets: [
  //     "gameLines",
  //     // "wnbaPlayerProps"
  //   ],
  // },
};

const GAME_LINE_BOOK_WEIGHTS = {
  // --- Sharp Books (Total Weight: 14.99) ---
  pinnacle: { type: "sharp", weights: { default: 3.0 } }, // 20.0133%
  novig: { type: "sharp", weights: { default: 2.0 } }, // 13.3422%
  prophetx: { type: "sharp", weights: { default: 2.0 } }, // 13.3422%
  matchbook: { type: "sharp", weights: { default: 2.0 } }, // 13.3422%
  smarkets: { type: "sharp", weights: { default: 2.0 } }, // 13.3422%
  betfair_ex_eu: { type: "sharp", weights: { default: 1.33 } }, // 8.8726%
  betfair_ex_au: { type: "sharp", weights: { default: 1.33 } }, // 8.8726%
  betfair_ex_uk: { type: "sharp", weights: { default: 1.33 } }, // 8.8726%

  // --- Market Books (Total Default Weight: 65.775) ---
  // Tier 1: Squarest Books
  betrivers: { type: "market", weights: { default: 7.5 } }, // 11.4024%
  ballybet: { type: "market", weights: { default: 7.5 } }, // 11.4024%
  mybookieag: { type: "market", weights: { default: 7.5 } }, // 11.4024%
  fliff: { type: "market", weights: { default: 7.0, icehockey_nhl: 5.0 } }, // 10.6423%
  unibet_uk: { type: "market", weights: { default: 7.0 } }, // 10.6423%

  // Tier 2: Major Market Makers
  betmgm: { type: "market", weights: { default: 5.0 } }, // 7.6016%
  hardrockbet: { type: "market", weights: { default: 5.0 } }, // 7.6016%
  fanatics: { type: "market", weights: { default: 5.0 } }, // 7.6016%

  // Tier 3: Mid-Tier Market Books
  espnbet: { type: "market", weights: { default: 2.0 } }, // 3.0406%
  bet365_au: { type: "market", weights: { default: 2.0 } }, // 3.0406%
  williamhill_us: { type: "market", weights: { default: 2.0 } }, // 3.0406%
  rebet: { type: "market", weights: { default: 2.0 } }, // 3.0406%
  onexbet: { type: "market", weights: { default: 2.0 } }, // 3.0406%
  betway: { type: "market", weights: { default: 2.0 } }, // 3.0406%

  // Tier 4: Sharpest & Low-Weight Market Books
  draftkings: { type: "market", weights: { default: 1.0 } }, // 1.5203%
  fanduel: { type: "market", weights: { default: 1.0 } }, // 1.5203%
  lowvig: { type: "market", weights: { default: 0.25 } }, // 0.3802%
  betonlineag: { type: "market", weights: { default: 0.025 } }, // 0.0380%
};

const PROP_BOOK_WEIGHTS = {
  // --- Sharp Books (Percentages sum to 100% of Sharp Consensus) ---
  pinnacle: { type: "sharp", weights: { default: 3.0 } }, // 22.22%
  novig: { type: "sharp", weights: { default: 2.0 } }, // 14.81%
  prophetx: { type: "sharp", weights: { default: 2.0 } }, // 14.81%
  betfair_ex_eu: { type: "sharp", weights: { default: 2.0 } }, // 14.81%
  draftkings: { type: "sharp", weights: { default: 0.25 } },
  fanduel: { type: "sharp", weights: { default: 1.0 } },
  matchbook: { type: "sharp", weights: { default: 1.0 } }, // NEW
  smarkets: { type: "sharp", weights: { default: 1.0 } }, // NEW

  // --- Market Books (Percentages sum to 100% of Market Consensus) ---
  // Tier 1: Squarest Books (Total: ~48.9% of Market Weight)
  betrivers: { type: "market", weights: { default: 7.5 } }, // 16.67%
  ballybet: { type: "market", weights: { default: 7.5 } }, // 16.67%
  fliff: { type: "market", weights: { default: 7.0 } }, // 15.56%

  // Tier 2: MGM/HardRock/Fanatics (Total: ~33.3% of Market Weight)
  betmgm: { type: "market", weights: { default: 5.0 } }, // 11.11%
  hardrockbet: { type: "market", weights: { default: 5.0 } }, // 11.11%
  fanatics: { type: "market", weights: { default: 5.0 } }, // 11.11%

  // Tier 3: Mid-Tier Market Books (Total: ~13.3% of Market Weight)
  espnbet: { type: "market", weights: { default: 2.0 } }, // 4.44%
  bet365_au: { type: "market", weights: { default: 2.0 } }, // 4.44%
  williamhill_us: { type: "market", weights: { default: 2.0 } }, // 4.44%
  rebet: { type: "market", weights: { default: 1.0 } }, // NEW
  mybookieag: { type: "market", weights: { default: 2.0 } },
  unibet_uk: { type: "market", weights: { default: 2.0 } }, // NEW
  betway: { type: "market", weights: { default: 2.0 } }, // NEW
};

const EV_TAB_WEIGHTS = {
  // --- Tier 1: The Benchmark Sharp Book (Total: 13.19%) ---
  pinnacle: { type: "sharp", weights: { default: 3.0 } }, // 13.1868%

  // --- Tier 2: Premier Sharp Books (Total: 20.88%) ---
  fanduel: { type: "market", weights: { default: 2.25 } }, // 9.8901%

  // --- Tier 3: Sharp Exchanges (Total: 35.16%) ---
  novig: { type: "sharp", weights: { default: 2.0 } }, // 8.7912%
  prophetx: { type: "sharp", weights: { default: 2.0 } }, // 8.7912%
  betfair_ex_eu: { type: "sharp", weights: { default: 2.0 } }, // 8.7912%
  betfair_ex_uk: { type: "sharp", weights: { default: 1.0 } }, // 14.81%
  betfair_ex_au: { type: "sharp", weights: { default: 1.0 } }, // 14.81%
  matchbook: { type: "sharp", weights: { default: 1.0 } }, // NEW
  smarkets: { type: "sharp", weights: { default: 1.0 } }, // NEW
  // --- Tier 4: Top-Tier Market Makers (Total: 7.69%) ---
  draftkings: { type: "market", weights: { default: 1.75 } }, // 7.6923%

  // --- Tier 5: Major Market Books (Total: 4.39%) ---
  williamhill_us: { type: "market", weights: { default: 1.0 } }, // 4.3956%

  // --- Tier 6: Standard Market Books (Total: 13.19%) ---
  espnbet: { type: "market", weights: { default: 0.75 } }, // 3.2967%
  fanatics: { type: "market", weights: { default: 0.75 } }, // 3.2967%
  hardrockbet: { type: "market", weights: { default: 0.75 } }, // 3.2967%
  bet365_au: { type: "market", weights: { default: 0.75 } }, // 3.2967%

  // --- Tier 7: Softer / Smaller Books (Total: 4.39%) ---
  betmgm: { type: "market", weights: { default: 0.25 } }, // 1.0989%
  betrivers: { type: "market", weights: { default: 0.25 } }, // 1.0989%
  ballybet: { type: "market", weights: { default: 0.25 } }, // 1.0989%
  fliff: { type: "market", weights: { default: 0.25 } }, // 1.0989%
  rebet: { type: "market", weights: { default: 0.25 } },
  mybookieag: { type: "market", weights: { default: 0.01 } },
  betonlineag: { type: "market", weights: { default: 0.125 } }, // 18.52%
  lowvig: { type: "market", weights: { default: 0.125 } }, // 14.81%
};

const BOOKMAKERS_TO_FETCH = Object.keys(GAME_LINE_BOOK_WEIGHTS).join(",");
/**
 * Calculates the current dynamic bankroll based on its own P&L.
 * @returns {number} The current bankroll.
 */
function calculateCurrentBankroll() {
  let totalDynamicPnl = 0;
  try {
    if (fs.existsSync("system_picks.json")) {
      const fileContent = fs.readFileSync("system_picks.json", "utf-8");
      if (fileContent) {
        const existingPicks = JSON.parse(fileContent);
        // --- THIS IS THE ONLY LINE THAT CHANGES ---
        // It now sums the dynamic P&L instead of the static P&L.
        totalDynamicPnl = existingPicks.reduce(
          (sum, pick) => sum + (pick.pnl_full_dynamic || 0),
          0
        );
      }
    }
  } catch (e) {
    console.error(
      "Error reading/calculating P&L for dynamic bankroll:",
      e.message
    );
    return BACKTEST_BANKROLL; // Fallback
  }

  const currentBankroll = BACKTEST_BANKROLL + totalDynamicPnl;

  console.log(`\nInitial/Static Bankroll: $${BACKTEST_BANKROLL.toFixed(2)}`);
  console.log(`Total Dynamic P/L to Date: $${totalDynamicPnl.toFixed(2)}`);
  console.log(
    `Using Dynamic Bankroll for new wagers: $${currentBankroll.toFixed(2)}`
  );

  return currentBankroll;
}
const americanToImplied = (odds) => {
  if (odds === null || typeof odds === "undefined") return 0;
  if (odds >= 100) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
};

const americanToDecimal = (odds) => {
  if (odds >= 100) return odds / 100 + 1;
  return 100 / Math.abs(odds) + 1;
};

const probToAmerican = (prob) => {
  if (!prob || prob <= 0 || prob >= 1) return null;
  let odds;
  if (prob >= 0.5) {
    odds = -((prob / (1 - prob)) * 100);
  } else {
    odds = 100 / prob - 100;
  }
  return parseFloat(odds.toFixed(4));
};

const calculateVigFreeLine = (odds) => {
  if (!odds || odds.oddsA === null || odds.oddsB === null) return null;
  const probA = americanToImplied(odds.oddsA);
  const probB = americanToImplied(odds.oddsB);
  const totalProb = probA + probB;
  if (totalProb <= 0) return null;
  const vigFreeProbA = probA / totalProb;
  return {
    oddsA: probToAmerican(vigFreeProbA),
    oddsB: probToAmerican(1 - vigFreeProbA),
  };
};

function calculateConsensusLine(oddsArray, removeVig = false) {
  if (!oddsArray || oddsArray.length === 0) return null;
  let totalWeight = 0;
  let weightedProbA = 0;
  let weightedProbB = 0;
  for (const item of oddsArray) {
    const probA = americanToImplied(item.oddsA);
    const probB = americanToImplied(item.oddsB);
    if (probA === 0 || probB === 0) continue;
    const weight = item.weight || 1.0;
    weightedProbA += probA * weight;
    weightedProbB += probB * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) return null;
  let consensusProbA = weightedProbA / totalWeight;
  let consensusProbB = weightedProbB / totalWeight;
  if (removeVig) {
    const totalProb = consensusProbA + consensusProbB;
    if (totalProb > 0) {
      consensusProbA /= totalProb;
      consensusProbB /= totalProb;
    }
  }
  return {
    oddsA: probToAmerican(consensusProbA),
    oddsB: probToAmerican(consensusProbB),
  };
}
function calculateConsensus(overPool, underPool, removeVig) {
  if (overPool.length === 0 || underPool.length === 0) return null;

  let weightedOverProb = 0,
    totalOverWeight = 0;
  overPool.forEach((item) => {
    weightedOverProb += americanToImplied(item.odds) * item.weight;
    totalOverWeight += item.weight;
  });
  const avgOverProb =
    totalOverWeight > 0 ? weightedOverProb / totalOverWeight : 0;

  let weightedUnderProb = 0,
    totalUnderWeight = 0;
  underPool.forEach((item) => {
    weightedUnderProb += americanToImplied(item.odds) * item.weight;
    totalUnderWeight += item.weight;
  });
  const avgUnderProb =
    totalUnderWeight > 0 ? weightedUnderProb / totalUnderWeight : 0;

  let finalOverProb = avgOverProb;
  if (removeVig) {
    const totalProb = avgOverProb + avgUnderProb;
    if (totalProb > 1) {
      // Only remove vig if total probability is over 100%
      finalOverProb = avgOverProb / totalProb;
    }
  }

  return {
    over: probToAmerican(finalOverProb),
    under: probToAmerican(1 - finalOverProb),
  };
}

function processAllData(allGames) {
  const processedGameLines = [];
  const propsMap = new Map();
  const oneWayMarketsMap = new Map();

  for (const game of allGames) {
    const gameData = {
      id: game.id,
      sport: game.sport_title,
      teamA: game.home_team,
      teamB: game.away_team,
      gameTime: game.commence_time,
    };
    let hasGameLines = false;
    const allMarkets = game.bookmakers.flatMap((b) =>
      b.markets.map((m) => ({ ...m, bookmaker: b.key }))
    );

    const moneylineOdds = allMarkets.filter((m) => m.key === "h2h");
    if (moneylineOdds.length > 0) {
      const consensus = processMoneylineMarket(
        game,
        moneylineOdds,
        GAME_LINE_BOOK_WEIGHTS
      );
      if (consensus) {
        gameData.moneyline = [consensus];
        hasGameLines = true;
      }
    }
    const allSpreadOdds = allMarkets.filter(
      (m) => m.key === "spreads" || m.key === "alternate_spreads"
    );
    if (allSpreadOdds.length > 0) {
      const processedLines = processGroupedMarket(
        game,
        allSpreadOdds,
        GAME_LINE_BOOK_WEIGHTS,
        "spreads"
      );
      if (processedLines) {
        gameData.spreads = processedLines;
        hasGameLines = true;
      }
    }
    const allTotalOdds = allMarkets.filter(
      (m) => m.key === "totals" || m.key === "alternate_totals"
    );
    if (allTotalOdds.length > 0) {
      const processedLines = processGroupedMarket(
        game,
        allTotalOdds,
        GAME_LINE_BOOK_WEIGHTS,
        "totals"
      );
      if (processedLines) {
        gameData.totals = processedLines;
        hasGameLines = true;
      }
    }

    if (hasGameLines) {
      // --- RE-INTRODUCED FILTERING LOGIC ---
      const marketsToFilter = ["spreads", "totals"];
      for (const market of marketsToFilter) {
        if (gameData[market] && gameData[market].length > 1) {
          // Find the main line (the one with the most bookmakers)
          const mainLine = gameData[market].reduce((prev, curr) =>
            (curr.bookmakerOdds?.length || 0) >
            (prev.bookmakerOdds?.length || 0)
              ? curr
              : prev
          );

          const mainLinePoint = mainLine.point;
          const lowerBound = mainLinePoint - ALT_LINE_RANGE_LIMIT;
          const upperBound = mainLinePoint + ALT_LINE_RANGE_LIMIT;

          // Filter out lines that are outside the desired range
          gameData[market] = gameData[market].filter(
            (line) => line.point >= lowerBound && line.point <= upperBound
          );
        }
      }
      processedGameLines.push(gameData);
    }

    // --- Prop Market Processing ---
    const propMarkets = allMarkets.filter(
      (m) =>
        m.key.startsWith("player_") ||
        m.key.startsWith("batter_") ||
        m.key.startsWith("pitcher_")
    );
    for (const market of propMarkets) {
      if (ONE_WAY_PROP_MARKETS.includes(market.key)) {
        const marketId = `${game.id}-${market.key}`;
        if (!oneWayMarketsMap.has(marketId)) {
          oneWayMarketsMap.set(marketId, {
            gameId: game.id,
            sport: game.sport_title,
            gameTime: game.commence_time,
            teamA: game.home_team,
            teamB: game.away_team,
            market: market.key,
            outcomes: [],
          });
        }
        oneWayMarketsMap.get(marketId).outcomes.push(
          ...market.outcomes.map((o) => ({
            ...o,
            bookmaker: market.bookmaker,
          }))
        );
      } else {
        for (const outcome of market.outcomes) {
          const propKey = `${game.id}-${market.key}-${outcome.description}-${outcome.point}`;
          if (!propsMap.has(propKey)) {
            propsMap.set(propKey, {
              propId: propKey,
              gameId: game.id,
              sport: game.sport_title,
              gameTime: game.commence_time,
              teamA: game.home_team,
              teamB: game.away_team,
              player: outcome.description,
              market: market.key,
              point: outcome.point,
              odds: [],
            });
          }
          propsMap
            .get(propKey)
            .odds.push({ ...outcome, bookmaker: market.bookmaker });
        }
      }
    }
  }

  let processedPlayerProps = [];
  for (const propData of propsMap.values()) {
    const processedProp = processPropMarket(propData, PROP_BOOK_WEIGHTS);
    if (processedProp) {
      delete propData.odds;
      processedPlayerProps.push({ ...propData, ...processedProp });
    }
  }

  for (const oneWayMarketData of oneWayMarketsMap.values()) {
    const processedOneWayProps = processOneWayMarket(
      oneWayMarketData,
      PROP_BOOK_WEIGHTS
    );
    if (processedOneWayProps) {
      processedPlayerProps.push(...processedOneWayProps);
    }
  }

  return { processedGameLines, processedPlayerProps };
}

function processMoneylineMarket(game, allOdds, bookWeights) {
  const sharpOdds = [];
  const marketOddsList = [];
  const allBookmakerOdds = [];
  const evTabPool = [];

  for (const market of allOdds) {
    const bookConfig = bookWeights[market.bookmaker];
    if (!bookConfig) continue;

    const homeOutcome = market.outcomes.find((o) => o.name === game.home_team);
    const awayOutcome = market.outcomes.find((o) => o.name === game.away_team);

    if (homeOutcome && awayOutcome) {
      if (
        homeOutcome.price < MIN_ODDS_LIMIT ||
        homeOutcome.price > MAX_ODDS_LIMIT ||
        awayOutcome.price < MIN_ODDS_LIMIT ||
        awayOutcome.price > MAX_ODDS_LIMIT
      ) {
        console.log(
          `- Ignoring outlier odds from ${market.bookmaker} for ${game.home_team} ML.`
        );
        continue;
      }

      // --- LOGIC CORRECTION ---
      // This now correctly checks for a sport-specific weight before using the default.
      const weight =
        bookConfig.weights[game.sport_key] || bookConfig.weights.default;
      const oddsData = {
        oddsA: homeOutcome.price,
        oddsB: awayOutcome.price,
        weight: weight,
      };
      // ----------------------

      if (bookConfig.type === "sharp") sharpOdds.push(oddsData);
      else marketOddsList.push(oddsData);

      const evTabBookConfig = EV_TAB_WEIGHTS[market.bookmaker];
      if (evTabBookConfig) {
        const evTabWeight =
          evTabBookConfig.weights[game.sport_key] ||
          evTabBookConfig.weights.default;
        evTabPool.push({
          oddsA: homeOutcome.price,
          oddsB: awayOutcome.price,
          weight: evTabWeight,
        });
      }

      const vigFreeLine = calculateVigFreeLine({
        oddsA: homeOutcome.price,
        oddsB: awayOutcome.price,
      });
      allBookmakerOdds.push({
        bookmaker: market.bookmaker,
        type: bookConfig.type,
        vigOdds: { oddsA: homeOutcome.price, oddsB: awayOutcome.price },
        trueOdds: vigFreeLine,
      });
    }
  }

  if (sharpOdds.length < 3 || marketOddsList.length < 5) {
    return null;
  }

  const trueOdds = calculateConsensusLine(sharpOdds, true);
  const marketOdds = calculateConsensusLine(marketOddsList, false);
  const trueMarketOdds = calculateConsensusLine(marketOddsList, true);
  const evTabTrueOdds = calculateConsensusLine(evTabPool, true);

  if (trueOdds && marketOdds && trueMarketOdds && evTabTrueOdds) {
    return {
      trueOdds,
      marketOdds,
      trueMarketOdds,
      evTabTrueOdds,
      sharpBookCount: sharpOdds.length,
      bookmakerOdds: allBookmakerOdds,
    };
  }
  return null;
}

function processGroupedMarket(game, allOddsForMarket, bookWeights, marketKey) {
  const outcomesByBookmaker = new Map();
  for (const market of allOddsForMarket) {
    if (!outcomesByBookmaker.has(market.bookmaker)) {
      outcomesByBookmaker.set(market.bookmaker, []);
    }
    outcomesByBookmaker.get(market.bookmaker).push(...market.outcomes);
  }

  const linesByPoint = new Map();
  for (const [bookmaker, allOutcomes] of outcomesByBookmaker.entries()) {
    const homeOutcomes = allOutcomes.filter(
      (o) =>
        o.name === game.home_team ||
        (marketKey === "totals" && o.name === "Over")
    );
    const awayOutcomes = allOutcomes.filter(
      (o) =>
        o.name === game.away_team ||
        (marketKey === "totals" && o.name === "Under")
    );
    const seenPoints = new Set();
    homeOutcomes.forEach((homeOutcome) => {
      if (seenPoints.has(homeOutcome.point)) return;
      const oppositePoint =
        marketKey === "spreads" ? -homeOutcome.point : homeOutcome.point;
      const awayOutcome = awayOutcomes.find((o) => o.point === oppositePoint);
      if (awayOutcome) {
        const point = homeOutcome.point;
        if (!linesByPoint.has(point)) {
          linesByPoint.set(point, []);
        }
        linesByPoint.get(point).push({ bookmaker, homeOutcome, awayOutcome });
        seenPoints.add(point);
      }
    });
  }

  const processedLines = [];
  for (const [point, bookmakerLines] of linesByPoint.entries()) {
    const sharpOdds = [];
    const marketOddsList = [];
    const allBookmakerOdds = [];
    const evTabPool = [];

    for (const line of bookmakerLines) {
      const bookConfig = bookWeights[line.bookmaker];
      if (!bookConfig) continue;

      if (
        line.homeOutcome.price < MIN_ODDS_LIMIT ||
        line.homeOutcome.price > MAX_ODDS_LIMIT ||
        line.awayOutcome.price < MIN_ODDS_LIMIT ||
        line.awayOutcome.price > MAX_ODDS_LIMIT
      ) {
        console.log(
          `- Ignoring outlier ${marketKey} odds from ${line.bookmaker} for point ${point}.`
        );
        continue;
      }

      // --- LOGIC CORRECTION ---
      // This now correctly checks for a sport-specific weight before using the default.
      const weight =
        bookConfig.weights[game.sport_key] || bookConfig.weights.default;
      const oddsData = {
        oddsA: line.homeOutcome.price,
        oddsB: line.awayOutcome.price,
        weight: weight,
      };
      // ----------------------

      if (bookConfig.type === "sharp") sharpOdds.push(oddsData);
      else marketOddsList.push(oddsData);

      const evTabBookConfig = EV_TAB_WEIGHTS[line.bookmaker];
      if (evTabBookConfig) {
        const evTabWeight =
          evTabBookConfig.weights[game.sport_key] ||
          evTabBookConfig.weights.default;
        evTabPool.push({
          oddsA: line.homeOutcome.price,
          oddsB: line.awayOutcome.price,
          weight: evTabWeight,
        });
      }

      const vigFreeLine = calculateVigFreeLine(oddsData);
      allBookmakerOdds.push({
        bookmaker: line.bookmaker,
        type: bookConfig.type,
        vigOdds: {
          oddsA: line.homeOutcome.price,
          oddsB: line.awayOutcome.price,
        },
        trueOdds: vigFreeLine,
      });
    }

    if (sharpOdds.length < 3 || marketOddsList.length < 5) {
      continue;
    }

    const trueOdds = calculateConsensusLine(sharpOdds, true);
    const marketOdds =
      marketOddsList.length > 0
        ? calculateConsensusLine(marketOddsList, false)
        : null;
    const trueMarketOdds =
      marketOddsList.length > 0
        ? calculateConsensusLine(marketOddsList, true)
        : null;
    const evTabTrueOdds = calculateConsensusLine(evTabPool, true);

    if (trueOdds && evTabTrueOdds) {
      processedLines.push({
        point,
        trueOdds,
        marketOdds,
        trueMarketOdds,
        evTabTrueOdds,
        sharpBookCount: sharpOdds.length,
        bookmakerOdds: allBookmakerOdds,
      });
    }
  }
  return processedLines.length > 0 ? processedLines : null;
}

function processPropMarket(propData, bookWeights) {
  const sharpOver = [],
    sharpUnder = [],
    marketOver = [],
    marketUnder = [];
  const bookmakerOdds = [];
  const tempBookOdds = {};
  const evTabPoolOver = [];
  const evTabPoolUnder = [];

  propData.odds.forEach((o) => {
    if (!tempBookOdds[o.bookmaker]) tempBookOdds[o.bookmaker] = {};
    tempBookOdds[o.bookmaker][o.name.toLowerCase()] = o.price;
  });

  for (const bookmaker in tempBookOdds) {
    const bookConfig = bookWeights[bookmaker];
    if (bookConfig) {
      const bookData = {
        bookmaker,
        type: bookConfig.type,
        vigOdds: {
          over: tempBookOdds[bookmaker].over,
          under: tempBookOdds[bookmaker].under,
        },
      };
      const oddsPair = {
        oddsA: bookData.vigOdds.over,
        oddsB: bookData.vigOdds.under,
      };
      bookData.trueOdds = calculateVigFreeLine(oddsPair);
      bookmakerOdds.push(bookData);
    }
  }

  for (const book of bookmakerOdds) {
    const bookConfig = bookWeights[book.bookmaker];
    if (!bookConfig) continue;

    const overOdds = book.vigOdds.over;
    const underOdds = book.vigOdds.under;

    if (
      (overOdds !== null &&
        (overOdds < MIN_ODDS_LIMIT || overOdds > MAX_ODDS_LIMIT)) ||
      (underOdds !== null &&
        (underOdds < MIN_ODDS_LIMIT || underOdds > MAX_ODDS_LIMIT))
    ) {
      console.log(
        `- Ignoring outlier prop odds from ${book.bookmaker} for ${propData.player} ${propData.point}.`
      );
      continue;
    }

    const weight =
      bookConfig.weights[propData.sport] || bookConfig.weights.default;
    if (overOdds)
      (bookConfig.type === "sharp" ? sharpOver : marketOver).push({
        odds: overOdds,
        weight,
      });
    if (underOdds)
      (bookConfig.type === "sharp" ? sharpUnder : marketUnder).push({
        odds: underOdds,
        weight,
      });

    const evTabBookConfig = EV_TAB_WEIGHTS[book.bookmaker];
    if (evTabBookConfig) {
      const evTabWeight =
        evTabBookConfig.weights[propData.sport] ||
        evTabBookConfig.weights.default;
      if (overOdds) evTabPoolOver.push({ odds: overOdds, weight: evTabWeight });
      if (underOdds)
        evTabPoolUnder.push({ odds: underOdds, weight: evTabWeight });
    }
  }

  const trueOdds = calculateConsensus(sharpOver, sharpUnder, true);
  const marketOdds = calculateConsensus(marketOver, marketUnder, false);
  const trueMarketOdds = calculateConsensus(marketOver, marketUnder, true);
  const evTabTrueOdds = calculateConsensus(evTabPoolOver, evTabPoolUnder, true);

  if (!trueOdds || !evTabTrueOdds || bookmakerOdds.length === 0) return null;

  return { trueOdds, marketOdds, trueMarketOdds, evTabTrueOdds, bookmakerOdds };
}

function processOneWayMarket(marketData, bookWeights) {
  const outcomesByPlayer = new Map();

  for (const outcome of marketData.outcomes) {
    // CORRECTED: Use outcome.description for the player's name
    const playerName = outcome.description;
    if (!outcomesByPlayer.has(playerName)) {
      outcomesByPlayer.set(playerName, []);
    }
    outcomesByPlayer
      .get(playerName)
      .push({ bookmaker: outcome.bookmaker, price: outcome.price });
  }

  const sharpBookTotals = new Map();
  for (const outcome of marketData.outcomes) {
    if (outcome.price < MIN_ODDS_LIMIT || outcome.price > MAX_ODDS_LIMIT) {
      console.log(
        `- Ignoring outlier one-way odds from ${outcome.bookmaker} for ${outcome.name}.`
      );
      continue;
    }
    const bookConfig = bookWeights[outcome.bookmaker];
    if (bookConfig && bookConfig.type === "sharp") {
      const currentTotal = sharpBookTotals.get(outcome.bookmaker) || 0;
      sharpBookTotals.set(
        outcome.bookmaker,
        currentTotal + americanToImplied(outcome.price)
      );
    }
  }

  const playerTrueProbs = new Map();
  for (const [player, oddsList] of outcomesByPlayer.entries()) {
    let weightedProbSum = 0;
    let totalWeight = 0;
    for (const odd of oddsList) {
      const evTabBookConfig = EV_TAB_WEIGHTS[odd.bookmaker];
      const totalMarketProb = sharpBookTotals.get(odd.bookmaker);
      if (
        evTabBookConfig &&
        evTabBookConfig.type === "sharp" &&
        totalMarketProb > 0
      ) {
        const trueProb = americanToImplied(odd.price) / totalMarketProb;
        const weight =
          evTabBookConfig.weights[marketData.sport] ||
          evTabBookConfig.weights.default;
        weightedProbSum += trueProb * weight;
        totalWeight += weight;
      }
    }
    if (totalWeight > 0) {
      const consensusProb = weightedProbSum / totalWeight;
      playerTrueProbs.set(player, consensusProb);
    }
  }

  const finalProps = [];
  for (const [player, oddsList] of outcomesByPlayer.entries()) {
    const trueProb = playerTrueProbs.get(player);
    if (trueProb) {
      const allBookmakerOdds = oddsList.map((o) => {
        const bookConfig = bookWeights[o.bookmaker];
        // Use 'over' to represent the 'Yes' price to match the frontend logic
        return {
          bookmaker: o.bookmaker,
          type: bookConfig?.type,
          vigOdds: { over: o.price, under: null },
          trueOdds: null,
        };
      });

      finalProps.push({
        propId: `${marketData.gameId}-${marketData.market}-${player}`,
        gameId: marketData.gameId,
        sport: marketData.sport,
        gameTime: marketData.gameTime,
        teamA: marketData.teamA,
        teamB: marketData.teamB,
        player: player,
        market: marketData.market,
        point: null,
        trueOdds: null,
        marketOdds: null,
        trueMarketOdds: null,
        trueProb: trueProb,
        bookmakerOdds: allBookmakerOdds,
      });
    }
  }
  return finalProps.length > 0 ? finalProps : null;
}

function logSystemPicks(processedGameLines, dynamicBankroll) {
  const newPicks = [];
  const timestamp = new Date().toISOString();

  for (const game of processedGameLines) {
    const markets = ["moneyline", "spreads", "totals"];
    for (const marketKey of markets) {
      if (!game[marketKey] || game[marketKey].length === 0) continue;

      for (const line of game[marketKey]) {
        const marketBookCount = line.bookmakerOdds.filter(
          (b) => b.type === "market"
        ).length;

        if (
          !line ||
          !line.sharpBookCount ||
          line.sharpBookCount < 3 ||
          marketBookCount < 5 ||
          !line.trueOdds ||
          !line.trueMarketOdds ||
          !line.marketOdds
        ) {
          continue;
        }

        // --- Check Side A ---
        const trueProbA = americanToImplied(line.trueOdds.oddsA);
        const edgeA = trueProbA - americanToImplied(line.trueMarketOdds.oddsA);
        if (edgeA >= MIN_EDGE_THRESHOLD_FOR_LOGGING) {
          const marketOdds = line.trueMarketOdds.oddsA;
          let bestBet = { price: -Infinity, bookmaker: null };
          for (const book of line.bookmakerOdds) {
            if (BOOKS_TO_EXCLUDE_FROM_BEST_ODDS.includes(book.bookmaker))
              continue;
            if (book.vigOdds && book.vigOdds.oddsA != null) {
              if (
                americanToDecimal(book.vigOdds.oddsA) >
                americanToDecimal(bestBet.price)
              ) {
                bestBet = {
                  price: book.vigOdds.oddsA,
                  bookmaker: book.bookmaker,
                };
              }
            }
          }
          if (bestBet.bookmaker) {
            const p = trueProbA;
            const q = 1 - p;
            const b = americanToDecimal(marketOdds) - 1;
            const fullKellyFraction = b > 0 ? (b * p - q) / b : 0;
            if (fullKellyFraction > 0) {
              newPicks.push({
                pickId: `${game.id}-${marketKey}-${line.point}-A`,
                gameId: game.id,
                sport: game.sport,
                gameTime: game.gameTime,
                teamA: game.teamA,
                teamB: game.teamB,
                marketKey,
                point: line.point,
                side: "A",
                odds: bestBet.price,
                bookmaker: bestBet.bookmaker,
                bookmakerCount: line.bookmakerOdds.length,
                edge: edgeA,
                novaConsensus: line.trueOdds.oddsA,
                marketConsensus: line.trueMarketOdds.oddsA,

                // Static Wagers (Original Fields)
                wager_full: (BACKTEST_BANKROLL * fullKellyFraction).toFixed(2),
                percent_full: fullKellyFraction.toFixed(4),
                wager_half: (
                  BACKTEST_BANKROLL *
                  fullKellyFraction *
                  0.5
                ).toFixed(2),
                percent_half: (fullKellyFraction * 0.5).toFixed(4),
                wager_quarter: (
                  BACKTEST_BANKROLL *
                  fullKellyFraction *
                  0.25
                ).toFixed(2),
                percent_quarter: (fullKellyFraction * 0.25).toFixed(4),

                // Dynamic Wagers (New Fields)
                wager_full_dynamic: (
                  dynamicBankroll * fullKellyFraction
                ).toFixed(2),
                wager_half_dynamic: (
                  dynamicBankroll *
                  fullKellyFraction *
                  0.5
                ).toFixed(2),
                wager_quarter_dynamic: (
                  dynamicBankroll *
                  fullKellyFraction *
                  0.25
                ).toFixed(2),

                loggedAt: timestamp,
                result: null,
              });
            }
          }
        }

        // --- Check Side B ---
        const trueProbB = americanToImplied(line.trueOdds.oddsB);
        const edgeB = trueProbB - americanToImplied(line.trueMarketOdds.oddsB);
        if (edgeB >= MIN_EDGE_THRESHOLD_FOR_LOGGING) {
          const marketOdds = line.trueMarketOdds.oddsB;
          let bestBet = { price: -Infinity, bookmaker: null };
          for (const book of line.bookmakerOdds) {
            if (BOOKS_TO_EXCLUDE_FROM_BEST_ODDS.includes(book.bookmaker))
              continue;
            if (book.vigOdds && book.vigOdds.oddsB != null) {
              if (
                americanToDecimal(book.vigOdds.oddsB) >
                americanToDecimal(bestBet.price)
              ) {
                bestBet = {
                  price: book.vigOdds.oddsB,
                  bookmaker: book.bookmaker,
                };
              }
            }
          }
          if (bestBet.bookmaker) {
            const p = trueProbB;
            const q = 1 - p;
            const b = americanToDecimal(marketOdds) - 1;
            const fullKellyFraction = b > 0 ? (b * p - q) / b : 0;
            if (fullKellyFraction > 0) {
              let displayPoint = line.point;
              const idPoint = line.point;
              if (marketKey === "spreads" && typeof displayPoint === "number") {
                displayPoint = -displayPoint;
              }
              newPicks.push({
                pickId: `${game.id}-${marketKey}-${idPoint}-B`,
                gameId: game.id,
                sport: game.sport,
                gameTime: game.gameTime,
                teamA: game.teamA,
                teamB: game.teamB,
                marketKey,
                point: displayPoint,
                side: "B",
                odds: bestBet.price,
                bookmaker: bestBet.bookmaker,
                bookmakerCount: line.bookmakerOdds.length,
                edge: edgeB,
                novaConsensus: line.trueOdds.oddsB,
                marketConsensus: line.trueMarketOdds.oddsB,

                // Static Wagers (Original Fields)
                wager_full: (BACKTEST_BANKROLL * fullKellyFraction).toFixed(2),
                percent_full: fullKellyFraction.toFixed(4),
                wager_half: (
                  BACKTEST_BANKROLL *
                  fullKellyFraction *
                  0.5
                ).toFixed(2),
                percent_half: (fullKellyFraction * 0.5).toFixed(4),
                wager_quarter: (
                  BACKTEST_BANKROLL *
                  fullKellyFraction *
                  0.25
                ).toFixed(2),
                percent_quarter: (fullKellyFraction * 0.25).toFixed(4),

                // Dynamic Wagers (New Fields)
                wager_full_dynamic: (
                  dynamicBankroll * fullKellyFraction
                ).toFixed(2),
                wager_half_dynamic: (
                  dynamicBankroll *
                  fullKellyFraction *
                  0.5
                ).toFixed(2),
                wager_quarter_dynamic: (
                  dynamicBankroll *
                  fullKellyFraction *
                  0.25
                ).toFixed(2),

                loggedAt: timestamp,
                result: null,
              });
            }
          }
        }
      }
    }
  }

  if (newPicks.length > 0) {
    let existingPicks = [];
    try {
      if (fs.existsSync("system_picks.json")) {
        const fileContent = fs.readFileSync("system_picks.json", "utf-8");
        if (fileContent) {
          existingPicks = JSON.parse(fileContent);
        }
      }
    } catch (e) {
      console.error("Error reading or parsing system_picks.json:", e.message);
    }

    const pickMap = new Map(existingPicks.map((p) => [p.pickId, p]));
    let newCount = 0;
    let updatedCount = 0;

    newPicks.forEach((newPick) => {
      const opposingSide = newPick.side === "A" ? "B" : "A";
      let idPointForLookup = newPick.point;
      if (newPick.marketKey === "spreads" && newPick.side === "B") {
        idPointForLookup = -newPick.point;
      }
      const opposingPickId = `${newPick.gameId}-${newPick.marketKey}-${idPointForLookup}-${opposingSide}`;
      const opposingPick = pickMap.get(opposingPickId);
      if (opposingPick) {
        if (newPick.edge > opposingPick.edge) {
          pickMap.delete(opposingPickId);
          console.log(
            `- Edge flipped: Replaced ${opposingPickId} with ${newPick.pickId}`
          );
        } else {
          console.log(`- Edge flipped to worse line: Kept ${opposingPickId}`);
          return;
        }
      }
      const existingPick = pickMap.get(newPick.pickId);
      if (!existingPick) {
        pickMap.set(newPick.pickId, newPick);
        newCount++;
      } else if (newPick.edge > existingPick.edge) {
        console.log(
          `- Edge improved: Updated ${newPick.pickId} from ${(
            existingPick.edge * 100
          ).toFixed(2)}% to ${(newPick.edge * 100).toFixed(2)}%`
        );
        pickMap.set(newPick.pickId, newPick);
        updatedCount++;
      }
    });

    fs.writeFileSync(
      "system_picks.json",
      JSON.stringify(Array.from(pickMap.values()), null, 2)
    );
    console.log(
      `\nLogged ${newCount} new and updated ${updatedCount} existing picks.`
    );
  } else {
    console.log("\nNo new system picks met the edge threshold.");
  }
}

function logBookmakerDeviations(processedGameLines, processedPlayerProps) {
  const newLogs = [];
  const timestamp = new Date().toISOString();

  const processMarketData = (item, marketKey, line) => {
    // Ensure we have a consensus line and bookmaker odds to compare
    if (!line.trueOdds || !line.bookmakerOdds) return;

    const novaLineProbA = americanToImplied(line.trueOdds.oddsA);
    const novaLineProbB = americanToImplied(line.trueOdds.oddsB);

    for (const book of line.bookmakerOdds) {
      // Ensure the bookmaker has a valid, vig-free two-way line
      if (
        !book.trueOdds ||
        book.trueOdds.oddsA === null ||
        book.trueOdds.oddsB === null
      )
        continue;

      const bookProbA = americanToImplied(book.trueOdds.oddsA);
      const bookProbB = americanToImplied(book.trueOdds.oddsB);

      // Log the deviation for Side A (Home Team / Over)
      newLogs.push({
        timestamp,
        gameId: item.id || item.gameId,
        sport: item.sport,
        marketKey,
        point: line.point !== undefined ? line.point : null,
        player: item.player || null,
        bookmaker: book.bookmaker,
        side: "A",
        bookmakerTrueProb: bookProbA,
        novaLineTrueProb: novaLineProbA,
        deviation: bookProbA - novaLineProbA,
      });

      // Log the deviation for Side B (Away Team / Under)
      newLogs.push({
        timestamp,
        gameId: item.id || item.gameId,
        sport: item.sport,
        marketKey,
        point: line.point !== undefined ? line.point : null,
        player: item.player || null,
        bookmaker: book.bookmaker,
        side: "B",
        bookmakerTrueProb: bookProbB,
        novaLineTrueProb: novaLineProbB,
        deviation: bookProbB - novaLineProbB,
      });
    }
  };

  // Process all game lines (Moneyline, Spreads, Totals)
  for (const game of processedGameLines) {
    if (game.moneyline) processMarketData(game, "moneyline", game.moneyline[0]);
    if (game.spreads)
      game.spreads.forEach((line) => processMarketData(game, "spreads", line));
    if (game.totals)
      game.totals.forEach((line) => processMarketData(game, "totals", line));
  }

  // Process all player props
  for (const prop of processedPlayerProps) {
    // Only process props that have a two-way market (Over/Under)
    if (prop.trueOdds) {
      processMarketData(prop, prop.market, prop);
    }
  }

  if (newLogs.length > 0) {
    let existingLogs = [];
    try {
      if (fs.existsSync("bookmaker_analytics.json")) {
        const fileContent = fs.readFileSync(
          "bookmaker_analytics.json",
          "utf-8"
        );
        // Ensure file is not empty before parsing
        if (fileContent) existingLogs = JSON.parse(fileContent);
      }
    } catch (e) {
      console.error(
        "Error reading or parsing bookmaker_analytics.json:",
        e.message
      );
    }

    // Append new logs to existing ones to build the historical dataset
    const allLogs = existingLogs.concat(newLogs);
    fs.writeFileSync(
      "bookmaker_analytics.json",
      JSON.stringify(allLogs, null, 2)
    );
    console.log(
      `\nLogged ${newLogs.length} new bookmaker deviation records to bookmaker_analytics.json.`
    );
  } else {
    console.log("\nNo new bookmaker deviation data to log.");
  }
}

async function getLiveOdds() {
  if (!ODDS_API_KEY) {
    console.error("ERROR: Please add your key from The Odds API.");
    return;
  }
  let args = process.argv.slice(2);
  let cliMarkets = null;
  let daysAhead = FETCH_DAYS_AHEAD;
  const marketsIndex = args.indexOf("--markets");
  if (marketsIndex !== -1) {
    if (args.length > marketsIndex + 1) {
      cliMarkets = args[marketsIndex + 1];
      args.splice(marketsIndex, 2);
    }
  }
  const daysIndex = args.indexOf("--days");
  if (daysIndex !== -1) {
    if (args.length > daysIndex + 1) {
      const parsedDays = parseInt(args[daysIndex + 1], 10);
      if (!isNaN(parsedDays) && parsedDays >= 0) {
        daysAhead = parsedDays;
        args.splice(daysIndex, 2);
      }
    }
  }

  console.log("\n--- Phase 1: Fetching all upcoming game IDs ---");
  let upcomingEvents = [];
  try {
    const eventRequests = Object.keys(SPORT_CONFIG).map((sport) => {
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/events?apiKey=${ODDS_API_KEY}&bookmakers=draftkings`;
      return axios.get(url);
    });
    const eventResponses = await Promise.all(eventRequests);
    eventResponses.forEach((response) => {
      if (response.data) upcomingEvents = upcomingEvents.concat(response.data);
    });
    console.log(`Found ${upcomingEvents.length} total upcoming events.`);
  } catch (error) {
    console.error(
      "API Request for events failed:",
      error.response ? error.response.data : error.message
    );
    return;
  }

  const now = new Date();
  const endDate = new Date();
  endDate.setDate(now.getDate() + daysAhead);
  let originalEventCount = upcomingEvents.length;
  upcomingEvents = upcomingEvents.filter((event) => {
    const eventTime = new Date(event.commence_time);
    return eventTime > now && eventTime < endDate;
  });
  console.log(`--- Filtering events within the next ${daysAhead} days ---`);
  console.log(
    `Filtered from ${originalEventCount} down to ${upcomingEvents.length} events.`
  );

  const targetTeams = args;
  const isSpecificGameSearch = targetTeams.length > 0;
  if (isSpecificGameSearch) {
    if (targetTeams.length % 2 !== 0) {
      console.error(
        "Error: Please provide teams in pairs for a specific game search."
      );
      return;
    }
    const targetPairs = [];
    for (let i = 0; i < targetTeams.length; i += 2) {
      targetPairs.push({
        teamA: targetTeams[i].toLowerCase(),
        teamB: targetTeams[i + 1].toLowerCase(),
      });
    }
    console.log(
      `--- Specific Game Search Mode: Looking for ${targetPairs.length} game(s) ---`
    );
    const originalCount = upcomingEvents.length;
    const foundEvents = upcomingEvents.filter((event) => {
      const home = event.home_team.toLowerCase();
      const away = event.away_team.toLowerCase();
      return targetPairs.some(
        (pair) =>
          (home.includes(pair.teamA) && away.includes(pair.teamB)) ||
          (home.includes(pair.teamB) && away.includes(pair.teamA))
      );
    });

    if (foundEvents.length === 0) {
      console.error(
        "\nError: Could not find any matching games for the teams provided in the specified date range."
      );
      return;
    }
    console.log(
      `Filtered from ${originalCount} down to ${foundEvents.length} matching event(s).`
    );
    upcomingEvents = foundEvents;
  }

  if (PREFILTER_MIN_ODDS !== null || PREFILTER_MAX_ODDS !== null) {
    console.log(
      `\n--- Pre-filtering events by odds: Min ${
        PREFILTER_MIN_ODDS ?? "N/A"
      }, Max ${PREFILTER_MAX_ODDS ?? "N/A"} ---`
    );
    originalEventCount = upcomingEvents.length;
    upcomingEvents = upcomingEvents.filter((event) => {
      if (
        !event.bookmakers ||
        !event.bookmakers[0] ||
        !event.bookmakers[0].markets[0]
      )
        return true;
      const outcomes = event.bookmakers[0].markets[0].outcomes;
      if (outcomes.length < 2) return true;
      const odds1 = outcomes[0].price;
      const odds2 = outcomes[1].price;
      const minFilter =
        PREFILTER_MIN_ODDS !== null
          ? odds1 >= PREFILTER_MIN_ODDS && odds2 >= PREFILTER_MIN_ODDS
          : true;
      const maxFilter =
        PREFILTER_MAX_ODDS !== null
          ? odds1 <= PREFILTER_MAX_ODDS && odds2 <= PREFILTER_MAX_ODDS
          : true;
      return minFilter && maxFilter;
    });
    console.log(
      `Filtered from ${originalEventCount} down to ${upcomingEvents.length} events based on moneyline odds.`
    );
  }
  if (upcomingEvents.length === 0) {
    console.log("No upcoming games found to fetch odds for.");
    return;
  }

  console.log("\n--- Phase 2: Fetching detailed odds for each event ---");
  let allGamesData = [];
  try {
    for (const event of upcomingEvents) {
      const sportConfig = SPORT_CONFIG[event.sport_key];
      if (!sportConfig) continue;
      const marketsToFetch =
        cliMarkets ||
        sportConfig.markets
          .flatMap((category) => MARKET_DEFINITIONS[category] || [])
          .join(",");
      if (marketsToFetch.length === 0) {
        console.log(
          `No markets configured for event: ${event.home_team} vs ${event.away_team}. Skipping.`
        );
        continue;
      }
      // UPDATED: Added the &bookmakers= parameter to the URL
      const url = `https://api.the-odds-api.com/v4/sports/${event.sport_key}/events/${event.id}/odds?apiKey=${ODDS_API_KEY}&regions=${REGIONS}&bookmakers=${BOOKMAKERS_TO_FETCH}&markets=${marketsToFetch}&oddsFormat=${ODDS_FORMAT}`;

      const response = await axios.get(url);

      if (response.data) {
        allGamesData.push(response.data);
        console.log(
          `Fetched odds for event: ${event.home_team} vs ${event.away_team}`
        );
      }
      if (upcomingEvents.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
      }
    }
    console.log(
      `\nSuccessfully fetched detailed odds for ${allGamesData.length} event(s).`
    );
  } catch (error) {
    console.error(
      "API Request for detailed odds failed:",
      error.response ? error.response.data : error.message
    );
    return;
  }

  console.log("\n--- Phase 3: Processing and Saving Data ---");
  const { processedGameLines, processedPlayerProps } =
    processAllData(allGamesData);
  const dataToSave = {
    lastUpdated: new Date().toISOString(),
    games: processedGameLines,
  };
  fs.writeFileSync("games.json", JSON.stringify(dataToSave, null, 2));
  console.log(
    `\nSuccessfully saved ${processedGameLines.length} processed game lines to games.json`
  );
  const propsToSave = {
    lastUpdated: new Date().toISOString(),
    props: processedPlayerProps,
  };
  fs.writeFileSync("player_props.json", JSON.stringify(propsToSave, null, 2));
  console.log(
    `Successfully saved ${processedPlayerProps.length} processed player props to player_props.json`
  );

  console.log("\n--- Phase 4: Logging System Picks for Backtesting ---");
  const dynamicBankroll = calculateCurrentBankroll();
  logSystemPicks(processedGameLines, dynamicBankroll);

  console.log("\n--- Phase 5: Logging Granular Bookmaker Analytics ---");
  // logBookmakerDeviations(processedGameLines, processedPlayerProps);
}

getLiveOdds();
