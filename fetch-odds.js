const axios = require("axios");
const fs = require("fs");

// --- Configuration ---
const API_KEY = "f33d0ff53c01852f63c1bd2f59e9729c";
const REGIONS = "us,us2,eu,au";
const ODDS_FORMAT = "american";
const REQUEST_DELAY = 1000; // 500 milliseconds delay between requests to avoid rate limiting

// ** NEW: Configuration object for fetching sport-specific markets **
const SPORT_CONFIG = {
  // baseball_mlb: {
  //   markets: "h2h", // Only request pitcher strikeouts for MLB
  // },
  basketball_wnba: {
    markets: "h2h,spreads",
  },
  // mma_mixed_martial_arts: {
  //   markets: "h2h",
  // },
};

// --- Bookmaker Weights for GAME LINES ---
const GAME_LINE_BOOK_WEIGHTS = {
  pinnacle: { type: "sharp", weights: { default: 3.0 } },
  circasports: { type: "sharp", weights: { default: 2.0, baseball_mlb: 1.75 } },
  us_exprophetx: { type: "sharp", weights: { default: 2.5 } },
  us_exnovig: { type: "sharp", weights: { default: 1.5 } },
  fanduel: {
    type: "market",
    weights: { default: 0.1, mma_mixed_martial_arts: 0.5 },
  },
  draftkings: {
    type: "market",
    weights: { default: 0.5, mma_mixed_martial_arts: 0.1 },
  },
  williamhill_us: {
    type: "market",
    weights: { default: 0.5, baseball_mlb: 0.75, mma_mixed_martial_arts: 0.75 },
  },
  betmgm: { type: "market", weights: { default: 1.25, baseball_mlb: 1.5 } },
  espnbet: {
    type: "market",
    weights: { default: 1.25, mma_mixed_martial_arts: 1.0 },
  },
  fanatics: {
    type: "market",
    weights: { default: 1.25, baseball_mlb: 1.0, mma_mixed_martial_arts: 1.0 },
  },
  hardrockbet: {
    type: "market",
    weights: { default: 1.25, baseball_mlb: 1.0, mma_mixed_martial_arts: 1.75 },
  },
  bet365_au: {
    type: "market",
    weights: { default: 1.25, mma_mixed_martial_arts: 2.0 },
  },
  betrivers: {
    type: "market",
    weights: { default: 2.0, mma_mixed_martial_arts: 2.5 },
  },
  ballybet: {
    type: "market",
    weights: { default: 2.0, mma_mixed_martial_arts: 2.5 },
  },
  fliff: { type: "market", weights: { default: 1.5, baseball_mlb: 2.5 } },
};

// --- Bookmaker Weights for PLAYER PROPS ---
const PROP_BOOK_WEIGHTS = {
  pinnacle: { type: "sharp", weights: { default: 3.0 } },
  betcris: { type: "sharp", weights: { default: 2.5 } },
  draftkings: { type: "market", weights: { default: 1.5 } },
  fanduel: { type: "market", weights: { default: 1.5 } },
  betmgm: { type: "market", weights: { default: 1.0 } },
  caesars: { type: "market", weights: { default: 1.0 } },
  espnbet: { type: "market", weights: { default: 1.0 } },
};

// --- Helper Functions ---
const americanToImplied = (odds) => {
  if (odds >= 100) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
};

const probToAmerican = (prob) => {
  if (!prob || prob <= 0 || prob >= 1) return null;
  let odds;
  if (prob >= 0.5) {
    odds = -((prob / (1 - prob)) * 100);
  } else {
    odds = ((1 - prob) / prob) * 100;
  }
  return parseFloat(odds.toFixed(2));
};

// --- Main Logic ---
async function getLiveOdds() {
  console.log("--- Phase 1: Fetching all upcoming game IDs ---");
  let upcomingEvents = [];
  try {
    const eventRequests = Object.keys(SPORT_CONFIG).map((sport) => {
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/events?apiKey=${API_KEY}`;
      return axios.get(url);
    });
    const eventResponses = await Promise.all(eventRequests);
    eventResponses.forEach((response) => {
      if (response.data) {
        upcomingEvents = upcomingEvents.concat(response.data);
      }
    });
    console.log(`Found ${upcomingEvents.length} total upcoming events.`);
  } catch (error) {
    console.error(
      "API Request for events failed:",
      error.response ? error.response.data : error.message
    );
    return;
  }

  if (upcomingEvents.length === 0) {
    console.log("No upcoming games found.");
    return;
  }

  console.log(
    "\n--- Phase 2: Fetching detailed odds for each event (with delay) ---"
  );
  let allGamesWithProps = [];
  try {
    for (const event of upcomingEvents) {
      const sportConfig = SPORT_CONFIG[event.sport_key];
      if (!sportConfig) continue; // Skip if sport is not configured

      const url = `https://api.the-odds-api.com/v4/sports/${event.sport_key}/events/${event.id}/odds?apiKey=${API_KEY}&regions=${REGIONS}&markets=${sportConfig.markets}&oddsFormat=${ODDS_FORMAT}`;
      const response = await axios.get(url);
      if (response.data) {
        allGamesWithProps.push(response.data);
        console.log(`Fetched odds for event: ${event.id}`);
      }
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
    }
    console.log(
      `Successfully fetched detailed odds for ${allGamesWithProps.length} events.`
    );
  } catch (error) {
    console.error(
      "API Request for detailed odds failed:",
      error.response ? error.response.data : error.message
    );
    return;
  }

  console.log("\n--- Phase 3: Processing all data ---");
  const processedGameLines = [];
  const processedPlayerProps = groupAndProcessPlayerProps(allGamesWithProps);

  for (const game of allGamesWithProps) {
    const gameData = {
      id: game.id,
      sport: game.sport_title,
      teamA: game.home_team,
      teamB: game.away_team,
      gameTime: game.commence_time,
    };

    const gameLineMarkets = ["moneyline", "spreads", "totals"];
    for (const marketType of gameLineMarkets) {
      const marketData = processMarket(
        game,
        marketType,
        GAME_LINE_BOOK_WEIGHTS
      );
      if (marketData) {
        gameData[marketType] = marketData;
      }
    }

    if (gameData.moneyline || gameData.spreads || gameData.totals) {
      processedGameLines.push(gameData);
    }
  }

  fs.writeFileSync("games.json", JSON.stringify(processedGameLines, null, 2));
  console.log(
    `\nSuccessfully saved ${processedGameLines.length} processed game lines to games.json`
  );

  fs.writeFileSync(
    "player_props.json",
    JSON.stringify(processedPlayerProps, null, 2)
  );
  console.log(
    `Successfully saved ${processedPlayerProps.length} processed player props to player_props.json`
  );
}

function processMarket(game, marketType, bookWeights) {
  const marketKey = marketType === "moneyline" ? "h2h" : marketType;
  const sharpOdds = [];
  const marketOdds = [];

  for (const bookmaker of game.bookmakers) {
    const bookKey = bookmaker.key;
    const bookConfig = bookWeights[bookKey];
    const market = bookmaker.markets.find((m) => m.key === marketKey);

    if (bookConfig && market) {
      let outcomeA, outcomeB;

      if (marketKey === "h2h") {
        outcomeA = market.outcomes.find((o) => o.name === game.home_team);
        outcomeB = market.outcomes.find((o) => o.name === game.away_team);
      } else {
        for (const primaryOutcome of market.outcomes) {
          let tempOutcomeB = null;
          if (marketKey === "totals" && primaryOutcome.name === "Over") {
            tempOutcomeB = market.outcomes.find(
              (o) => o.name === "Under" && o.point === primaryOutcome.point
            );
          } else if (
            marketKey === "spreads" &&
            primaryOutcome.name === game.home_team
          ) {
            tempOutcomeB = market.outcomes.find(
              (o) =>
                o.name === game.away_team && o.point === -primaryOutcome.point
            );
          }

          if (tempOutcomeB) {
            outcomeA = primaryOutcome;
            outcomeB = tempOutcomeB;
            break;
          }
        }
      }

      if (outcomeA && outcomeB) {
        const weight =
          bookConfig.weights[game.sport_key] || bookConfig.weights.default;
        const odds = {
          oddsA: outcomeA.price,
          oddsB: outcomeB.price,
          point: outcomeA.point,
          weight: weight,
        };

        if (bookConfig.type === "sharp") sharpOdds.push(odds);
        else if (bookConfig.type === "market") marketOdds.push(odds);
      }
    }
  }

  const sharpConsensus = calculateConsensusLine(sharpOdds, true);
  const marketConsensus = calculateConsensusLine(marketOdds, true);

  if (sharpConsensus && marketConsensus) {
    return {
      true: sharpConsensus,
      market: marketConsensus,
      point: sharpOdds[0]?.point ?? marketOdds[0]?.point ?? null,
    };
  }
  return null;
}

function groupAndProcessPlayerProps(allGames) {
  const propsMap = new Map();

  for (const game of allGames) {
    for (const bookmaker of game.bookmakers) {
      for (const market of bookmaker.markets) {
        if (
          !market.key.startsWith("player_") &&
          !market.key.startsWith("batter_") &&
          !market.key.startsWith("pitcher_")
        )
          continue;

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
              sharpOdds: [],
              marketOdds: [],
            });
          }

          const propData = propsMap.get(propKey);
          const bookConfig = PROP_BOOK_WEIGHTS[bookmaker.key];
          if (bookConfig) {
            const weight =
              bookConfig.weights[game.sport_key] || bookConfig.weights.default;
            const oddsData = {
              book: bookmaker.key,
              price: outcome.price,
              name: outcome.name, // "Over" or "Under"
              weight: weight,
            };

            if (bookConfig.type === "sharp") {
              propData.sharpOdds.push(oddsData);
            } else {
              propData.marketOdds.push(oddsData);
            }
          }
        }
      }
    }
  }

  const processedProps = [];
  for (const propData of propsMap.values()) {
    const overOddsSharp = propData.sharpOdds.filter((o) => o.name === "Over");
    const underOddsSharp = propData.sharpOdds.filter((o) => o.name === "Under");
    const overOddsMarket = propData.marketOdds.filter((o) => o.name === "Over");
    const underOddsMarket = propData.marketOdds.filter(
      (o) => o.name === "Under"
    );

    const sharpConsensus = calculateConsensusLine(
      pairOdds(overOddsSharp, underOddsSharp),
      true
    );
    const marketConsensus = calculateConsensusLine(
      pairOdds(overOddsMarket, underOddsMarket),
      true
    );

    if (sharpConsensus && marketConsensus) {
      processedProps.push({
        ...propData,
        true: sharpConsensus,
        market: marketConsensus,
        sharpOdds: undefined, // Clean up temporary arrays
        marketOdds: undefined,
      });
    }
  }

  return processedProps;
}

function pairOdds(overArray, underArray) {
  const pairs = [];
  const minLength = Math.min(overArray.length, underArray.length);
  for (let i = 0; i < minLength; i++) {
    pairs.push({
      oddsA: overArray[i].price,
      oddsB: underArray[i].price,
      weight: (overArray[i].weight + underArray[i].weight) / 2,
    });
  }
  return pairs;
}

function calculateConsensusLine(oddsArray, isWeighted = false) {
  if (oddsArray.length === 0) return null;
  let totalWeight = 0,
    sumImpliedA = 0,
    sumImpliedB = 0;
  for (const item of oddsArray) {
    const weight = isWeighted ? item.weight : 1;
    sumImpliedA += americanToImplied(item.oddsA) * weight;
    sumImpliedB += americanToImplied(item.oddsB) * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) return null;
  const avgImpliedA = sumImpliedA / totalWeight;
  const avgImpliedB = sumImpliedB / totalWeight;
  const totalMarketProb = avgImpliedA + avgImpliedB;
  if (totalMarketProb <= 1) return null;
  const trueProbA = avgImpliedA / totalMarketProb;
  const trueProbB = avgImpliedB / totalMarketProb;
  return { oddsA: probToAmerican(trueProbA), oddsB: probToAmerican(trueProbB) };
}

getLiveOdds();
