const fs = require("fs");

const PICKS_FILE_PATH = "system_picks.json";
const BACKTEST_BANKROLL = 10000; // Base bankroll for unit calculation

function analyzePerformance() {
  // 1. Read the processed picks file
  let picks;
  try {
    const fileContent = fs.readFileSync(PICKS_FILE_PATH, "utf-8");
    picks = JSON.parse(fileContent);
  } catch (e) {
    console.error(`Error reading or parsing ${PICKS_FILE_PATH}:`, e.message);
    return;
  }

  // Filter for only the picks that have been graded
  const gradedPicks = picks.filter((p) => p.result !== null);

  if (gradedPicks.length === 0) {
    console.log("No graded picks found to analyze.");
    return;
  }

  // 2. Calculate Overall KPIs
  const totalWagered = gradedPicks.reduce(
    (sum, p) => sum + parseFloat(p.wager_full),
    0
  );
  const totalPnl = gradedPicks.reduce((sum, p) => sum + p.pnl_full, 0);
  const totalUnits = totalPnl / (BACKTEST_BANKROLL / 100);
  const roi = totalWagered > 0 ? (totalPnl / totalWagered) * 100 : 0;

  const wins = gradedPicks.filter((p) => p.result === "WIN").length;
  const losses = gradedPicks.filter((p) => p.result === "LOSS").length;
  const pushes = gradedPicks.filter((p) => p.result === "PUSH").length;
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  // 3. Generic grouping function
  const analyzeBy = (keyAccessor, groupNamer) => {
    return gradedPicks.reduce((acc, pick) => {
      const group = groupNamer ? groupNamer(pick) : pick[keyAccessor];
      if (!acc[group]) {
        acc[group] = {
          record: { W: 0, L: 0, P: 0 },
          pnl: 0,
          wagered: 0,
          units: 0,
        };
      }

      if (pick.result === "WIN") acc[group].record.W++;
      else if (pick.result === "LOSS") acc[group].record.L++;
      else if (pick.result === "PUSH") acc[group].record.P++;

      acc[group].pnl += pick.pnl_full;
      acc[group].wagered += parseFloat(pick.wager_full);
      acc[group].units += pick.pnl_full / (BACKTEST_BANKROLL / 100);

      return acc;
    }, {});
  };

  // Group by Edge Percentage
  const byEdge = analyzeBy("edge", (pick) => {
    const edgePercent = pick.edge * 100;
    if (edgePercent < 0.25) return "< 0.25%";
    const lowerBound = Math.floor(edgePercent / 0.25) * 0.25;
    const upperBound = lowerBound + 0.25;
    return `${lowerBound.toFixed(2)}% - ${upperBound.toFixed(2)}%`;
  });

  // Group by Wager Type/Size
  const byWager = {
    "Full Kelly": {
      record: { W: wins, L: losses, P: pushes },
      pnl: gradedPicks.reduce((s, p) => s + p.pnl_full, 0),
    },
    "Half Kelly": {
      record: { W: wins, L: losses, P: pushes },
      pnl: gradedPicks.reduce((s, p) => s + p.pnl_half, 0),
    },
    "Quarter Kelly": {
      record: { W: wins, L: losses, P: pushes },
      pnl: gradedPicks.reduce((s, p) => s + p.pnl_quarter, 0),
    },
  };

  // --- NEW ANALYSIS GROUPS ---
  const byProximity = analyzeBy(null, (pick) => {
    const hoursBefore =
      (new Date(pick.gameTime) - new Date(pick.loggedAt)) / (1000 * 60 * 60);
    if (hoursBefore < 1) return "A. < 1 Hour";
    if (hoursBefore < 3) return "B. 1-3 Hours";
    if (hoursBefore < 12) return "C. 3-12 Hours";
    if (hoursBefore < 24) return "D. 12-24 Hours";
    if (hoursBefore < 72) return "E. 1-3 Days";
    return "F. 3+ Days";
  });

  const bySharpBookCount = analyzeBy("sharpBookCount");

  const byBookmakerCount = analyzeBy("bookmakerCount", (pick) => {
    const count = pick.bookmakerCount;
    if (count <= 5) return "A. Low (2-5 Books)";
    if (count <= 10) return "B. Medium (6-10 Books)";
    if (count <= 15) return "C. High (11-15 Books)";
    return "D. Very High (16+ Books)";
  });

  // 4. Formatting and Display
  console.clear();
  console.log("--- Nova Sports Capital Performance Analysis ---");
  console.log("\n## Overall Performance (Full Wager)");
  console.table({
    "Total Picks": { value: gradedPicks.length },
    "Record (W-L-P)": { value: `${wins}-${losses}-${pushes}` },
    "Win Rate": { value: `${winRate.toFixed(2)}%` },
    "Total Wagered": { value: `$${totalWagered.toFixed(2)}` },
    "Total P/L": { value: `$${totalPnl.toFixed(2)}` },
    "Total Units": { value: totalUnits.toFixed(2) },
    ROI: { value: `${roi.toFixed(2)}%` },
  });

  const formatGroupData = (groupData) => {
    const formatted = {};
    const sortedKeys = Object.keys(groupData).sort(); // Sort keys alphabetically/numerically

    for (const key of sortedKeys) {
      const item = groupData[key];
      const roi = item.wagered > 0 ? (item.pnl / item.wagered) * 100 : 0;
      const totalPicks = item.record.W + item.record.L + item.record.P;
      if (totalPicks === 0) continue;

      formatted[key] = {
        "# Picks": totalPicks,
        Record: `${item.record.W}-${item.record.L}-${item.record.P}`,
        "P/L": `$${item.pnl.toFixed(2)}`,
        Units: item.units.toFixed(2),
        "ROI %": roi.toFixed(2),
      };
    }
    return formatted;
  };

  const bySport = analyzeBy("sport");
  const byMarket = analyzeBy("marketKey");

  console.log("\n## Performance by Sport");
  console.table(formatGroupData(bySport));

  console.log("\n## Performance by Market");
  console.table(formatGroupData(byMarket));

  console.log("\n## Performance by Edge (Did higher edge lead to higher ROI?)");
  console.table(formatGroupData(byEdge));

  console.log("\n## Performance by Wager Size (Kelly Strategy)");
  console.table({
    "Full Kelly": {
      Record: `${byWager["Full Kelly"].record.W}-${byWager["Full Kelly"].record.L}-${byWager["Full Kelly"].record.P}`,
      "P/L": `$${byWager["Full Kelly"].pnl.toFixed(2)}`,
    },
    "Half Kelly": {
      Record: `${byWager["Half Kelly"].record.W}-${byWager["Half Kelly"].record.L}-${byWager["Half Kelly"].record.P}`,
      "P/L": `$${byWager["Half Kelly"].pnl.toFixed(2)}`,
    },
    "Quarter Kelly": {
      Record: `${byWager["Quarter Kelly"].record.W}-${byWager["Quarter Kelly"].record.L}-${byWager["Quarter Kelly"].record.P}`,
      "P/L": `$${byWager["Quarter Kelly"].pnl.toFixed(2)}`,
    },
  });

  console.log("\n## Performance by Proximity to Game Time");
  console.table(formatGroupData(byProximity));

  console.log("\n## Performance by Sharp Book Count");
  console.table(formatGroupData(bySharpBookCount));

  console.log("\n## Performance by Market Liquidity (Bookmaker Count)");
  console.table(formatGroupData(byBookmakerCount));
}

analyzePerformance();
