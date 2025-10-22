// src/components/Analysis.jsx
import { useState, useEffect, useMemo } from "react";
import PicksModal from "./PicksModal";
import FilterControls from "./FilterControls";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function KpiCard({ title, value, subtext = "", tooltip = "" }) {
  return (
    <div className="kpi-card">
      <div className="kpi-title tooltip-container">
        {title}
        {tooltip && (
          <>
            <span className="tooltip-icon"> ⓘ</span>
            <div className="tooltip-text">{tooltip}</div>
          </>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      {subtext && <div className="kpi-subtext">{subtext}</div>}
    </div>
  );
}

function BreakdownTable({ title, data, onRowClick, sortBy = "pnl" }) {
  if (Object.keys(data).length === 0) return null;
  const sortedKeys = Object.keys(data).sort((a, b) => {
    if (sortBy === "pnl") return data[b].pnl - data[a].pnl;
    return a.localeCompare(b);
  });
  return (
    <div className="breakdown-table">
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th># Picks</th>
            <th>Record</th>
            <th>P/L</th>
            <th>Units</th>
            <th>ROI %</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sortedKeys.map((key) => {
            const item = data[key];
            const roi = item.wagered > 0 ? (item.pnl / item.wagered) * 100 : 0;
            return (
              <tr key={key}>
                <td>{key.includes(". ") ? key.substring(3) : key}</td>
                <td>{item.picks.length}</td>
                <td>{`${item.record.W}-${item.record.L}-${item.record.P}`}</td>
                <td className={item.pnl >= 0 ? "text-green" : "text-red"}>
                  {item.pnl >= 0 ? "+" : ""}${item.pnl.toFixed(2)}
                </td>
                <td className={item.units >= 0 ? "text-green" : "text-red"}>
                  {item.units >= 0 ? "+" : ""}
                  {item.units.toFixed(2)}
                </td>
                <td className={roi >= 0 ? "text-green" : "text-red"}>
                  {roi.toFixed(2)}%
                </td>
                <td>
                  <button
                    className="view-picks-btn"
                    onClick={() =>
                      onRowClick(
                        `Picks for: ${key.substring(key.indexOf(". ") + 2)}`,
                        item.picks
                      )
                    }
                  >
                    View Picks
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Analysis() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalPicks, setModalPicks] = useState(null);
  const [allPicks, setAllPicks] = useState([]);
  const [filters, setFilters] = useState({
    sport: "all",
    market: "all",
    minOdds: "",
    maxOdds: "",
    minEv: "",
    maxEv: "",
    startDate: null,
    endDate: null,
    kelly: "full",
    edgeIncrement: 0.25,
    wagerType: "static",
  });

  const openPicksModal = (title, picks) => setModalPicks({ title, picks });
  const closePicksModal = () => setModalPicks(null);

  const availableSports = useMemo(
    () => [...new Set(allPicks.map((p) => p.sport))].sort(),
    [allPicks]
  );
  const availableMarkets = useMemo(
    () => [...new Set(allPicks.map((p) => p.marketKey))].sort(),
    [allPicks]
  );

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:3001/api/system_picks")
      .then((res) => res.json())
      .then((picks) => {
        const gradedPicks = picks.filter((p) => p.result !== null);
        setAllPicks(gradedPicks);
      })
      .catch((err) => console.error("Failed to fetch system picks:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const filteredPicks = allPicks.filter((p) => {
      const sportMatch = filters.sport === "all" || p.sport === filters.sport;
      const marketMatch =
        filters.market === "all" || p.marketKey === filters.market;
      const minOdds = parseFloat(filters.minOdds) || -Infinity;
      const maxOdds = parseFloat(filters.maxOdds) || Infinity;
      const oddsMatch = p.odds >= minOdds && p.odds <= maxOdds;
      const minEv = (parseFloat(filters.minEv) || -Infinity) / 100;
      const maxEv = (parseFloat(filters.maxEv) || Infinity) / 100;
      const evMatch = p.edge >= minEv && p.edge <= maxEv;
      const gameDate = new Date(p.gameTime);
      const endDate = filters.endDate
        ? new Date(new Date(filters.endDate).setHours(23, 59, 59, 999))
        : null;
      const dateMatch =
        (!filters.startDate || gameDate >= filters.startDate) &&
        (!endDate || gameDate <= endDate);
      return sportMatch && marketMatch && oddsMatch && evMatch && dateMatch;
    });

    if (filteredPicks.length === 0) {
      setStats(null);
      return;
    }

    const BANKROLL = 10000;
    const wagerKey = `wager_${filters.kelly}`;
    const FLAT_STAKE = 100;

    const getWager = (pick) => {
      const baseKey = `wager_${filters.kelly}`;
      const dynamicKey = `${baseKey}_dynamic`;
      if (filters.wagerType === "dynamic" && pick[dynamicKey] != null) {
        return parseFloat(pick[dynamicKey]);
      }
      return parseFloat(pick[baseKey]) || 0;
    };

    const calculatePnL = (pick) => {
      const wager = getWager(pick);
      if (wager === 0) return 0;
      if (pick.result === "LOSS") return -wager;
      if (pick.result === "PUSH") return 0;
      if (pick.result === "WIN") {
        if (pick.odds >= 100) return wager * (pick.odds / 100);
        return wager * (100 / Math.abs(pick.odds));
      }
      return 0;
    };

    const calculateBenchmarkPnL = (pick) => {
      if (pick.result === "LOSS") return -FLAT_STAKE;
      if (pick.result === "PUSH") return 0;
      if (pick.result === "WIN") {
        if (pick.odds >= 100) return FLAT_STAKE * (pick.odds / 100);
        return FLAT_STAKE * (100 / Math.abs(pick.odds));
      }
      return 0;
    };

    const chronologicalPicks = [...filteredPicks].sort(
      (a, b) => new Date(a.gameTime) - new Date(b.gameTime)
    );
    const returns = chronologicalPicks.map((pick) => calculatePnL(pick));

    let cumulativePnl = 0,
      peak = 0,
      maxDrawdown = 0;
    returns.forEach((pnl) => {
      cumulativePnl += pnl;
      if (cumulativePnl > peak) peak = cumulativePnl;
      const drawdown = peak - cumulativePnl;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    const totalReturn = returns.reduce((a, b) => a + b, 0);
    const avgReturn = totalReturn / (returns.length || 1);
    const totalBenchmarkPnl = filteredPicks.reduce(
      (sum, pick) => sum + calculateBenchmarkPnL(pick),
      0
    );
    const totalBenchmarkUnits = totalBenchmarkPnl / FLAT_STAKE;

    const stdDev = Math.sqrt(
      returns
        .map((x) => Math.pow(x - avgReturn, 2))
        .reduce((a, b) => a + b, 0) / (returns.length || 1)
    );
    const sharpeRatio =
      stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(returns.length) : 0;
    const calmarRatio = maxDrawdown > 0 ? totalReturn / maxDrawdown : 0;

    const analyzeBy = (keyAccessor, groupNamer, data) => {
      return data.reduce((acc, pick) => {
        const group = groupNamer ? groupNamer(pick) : pick[keyAccessor];
        if (!group) return acc;
        if (!acc[group]) {
          acc[group] = {
            record: { W: 0, L: 0, P: 0 },
            pnl: 0,
            wagered: 0,
            units: 0,
            picks: [],
          };
        }
        if (pick.result === "WIN") acc[group].record.W++;
        else if (pick.result === "LOSS") acc[group].record.L++;
        else acc[group].record.P++;
        const pnl = calculatePnL(pick);
        const wager = getWager(pick);
        acc[group].pnl += pnl;
        acc[group].wagered += wager;
        acc[group].units += pnl / (BANKROLL / 100);
        acc[group].picks.push(pick);
        return acc;
      }, {});
    };

    let totalWagered = 0,
      wins = 0,
      losses = 0,
      pushes = 0;
    filteredPicks.forEach((p) => {
      totalWagered += getWager(p);
      if (p.result === "WIN") wins++;
      else if (p.result === "LOSS") losses++;
      else pushes++;
    });
    const roi = totalWagered > 0 ? (totalReturn / totalWagered) * 100 : 0;
    const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
    const totalUnits = totalReturn / (BANKROLL / 100);

    const calculatePnLWithWager = (pick, wager) => {
      if (wager === 0 || !pick.result) return 0;
      if (pick.result === "LOSS") return -wager;
      if (pick.result === "PUSH") return 0;
      if (pick.result === "WIN") {
        if (pick.odds >= 100) return wager * (pick.odds / 100);
        return wager * (100 / Math.abs(pick.odds));
      }
      return 0;
    };

    const dailyData = chronologicalPicks.reduce((acc, pick) => {
      const date = new Date(pick.gameTime).toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = {
          systemPnl: 0,
          benchmarkPnl: 0,
          dynamicPnl: 0,
          staticPnl: 0,
        };
      }
      acc[date].systemPnl += calculatePnL(pick);
      acc[date].benchmarkPnl += calculateBenchmarkPnL(pick);

      const staticWagerKey = `wager_${filters.kelly}`;
      const staticWager = parseFloat(pick[staticWagerKey]) || 0;
      acc[date].staticPnl += calculatePnLWithWager(pick, staticWager);

      const dynamicWagerKey = `wager_${filters.kelly}_dynamic`;
      const dynamicWager =
        parseFloat(pick[dynamicWagerKey] || pick[staticWagerKey]) || 0;
      acc[date].dynamicPnl += calculatePnLWithWager(pick, dynamicWager);

      return acc;
    }, {});

    const sortedDates = Object.keys(dailyData).sort();

    let cumulativeUnits = 0,
      cumulativeBenchmarkUnits = 0,
      cumulativeDynamicUnits = 0,
      cumulativeStaticUnits = 0;

    const chartData = sortedDates.map((date) => {
      cumulativeUnits += dailyData[date].systemPnl / (BANKROLL / 100);
      cumulativeBenchmarkUnits += dailyData[date].benchmarkPnl / FLAT_STAKE;
      cumulativeDynamicUnits += dailyData[date].dynamicPnl / (BANKROLL / 100);
      cumulativeStaticUnits += dailyData[date].staticPnl / (BANKROLL / 100);

      return {
        name: new Date(date + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        units: cumulativeUnits,
        benchmarkUnits: cumulativeBenchmarkUnits,
        dynamicUnits: cumulativeDynamicUnits,
        staticUnits: cumulativeStaticUnits,
      };
    });

    const daysOfWeek = [
      "A. Sunday",
      "B. Monday",
      "C. Tuesday",
      "D. Wednesday",
      "E. Thursday",
      "F. Friday",
      "G. Saturday",
    ];

    setStats({
      overall: {
        totalPnl: totalReturn,
        totalUnits,
        roi,
        winRate,
        record: `${wins}-${losses}-${pushes}`,
        sharpeRatio,
        calmarRatio,
        benchmarkPnl: totalBenchmarkPnl,
        benchmarkUnits: totalBenchmarkUnits,
      },
      bySport: analyzeBy("sport", null, filteredPicks),
      byMarket: analyzeBy("marketKey", null, filteredPicks),
      byDay: analyzeBy(
        "gameTime",
        (pick) => daysOfWeek[new Date(pick.gameTime).getDay()],
        filteredPicks
      ),
      byPlayer: analyzeBy(
        "player",
        null,
        filteredPicks.filter((p) => p.player)
      ),
      byEdge: analyzeBy(
        "edge",
        (pick) => {
          const edgeIncrement = parseFloat(filters.edgeIncrement) || 0.25;
          const edgePercent = pick.edge * 100;
          if (edgePercent < edgeIncrement) {
            return `A. 0.01% - ${edgeIncrement.toFixed(2)}%`;
          }
          const lowerBound =
            Math.floor(edgePercent / edgeIncrement) * edgeIncrement;
          const upperBound = lowerBound + edgeIncrement;
          return `B. ${lowerBound.toFixed(2)}% - ${upperBound.toFixed(2)}%`;
        },
        filteredPicks
      ),
      byBookmakerCount: analyzeBy(
        "bookmakerCount",
        (pick) => {
          const count = pick.bookmakerCount;
          if (count <= 5) return "A. 1-5 Books";
          if (count <= 9) return "B. 6-9 Books";
          if (count <= 12) return "C. 10-12 Books";
          if (count <= 14) return "D. 13-14 Books";
          return "E. 15+ Books";
        },
        filteredPicks
      ),
      byTimeToGame: analyzeBy(
        "timeToGame",
        (pick) => {
          const hoursToGame =
            (new Date(pick.gameTime) - new Date(pick.loggedAt)) /
            (1000 * 60 * 60);
          if (hoursToGame < 1) return "A. < 1 Hour";
          if (hoursToGame < 3) return "B. 1-3 Hours";
          if (hoursToGame < 12) return "C. 3-12 Hours";
          if (hoursToGame < 24) return "D. 12-24 Hours";
          return "E. > 24 Hours";
        },
        filteredPicks
      ),
      chartData: chartData,
    });
  }, [allPicks, filters]);

  if (loading) {
    return <div className="status-message">Loading analysis...</div>;
  }

  const sharpeTooltip = (
    <div>
      <p>
        <strong>The Sharpe Ratio</strong> answers the question: "Am I getting
        enough profit to justify the rollercoaster ride of wins and losses?" It
        scores your performance relative to your overall volatility.
      </p>
      <p>
        <em>
          Calculated by: (Average Profit per Bet) / (Volatility of Returns)
        </em>
      </p>
      <hr />
      <p>
        <strong>Poor:</strong> &lt; 1.0
      </p>
      <p>
        <strong>Good:</strong> 1.0 - 1.99
      </p>
      <p>
        <strong>Excellent:</strong> &ge; 2.0
      </p>
    </div>
  );
  const calmarTooltip = (
    <div>
      <p>
        <strong>The Calmar Ratio</strong> measures how well you recover from
        your worst losing streak. It compares your total profit to the biggest
        "hole" you had to climb out of.
      </p>
      <p>
        <em>Calculated by: (Total Profit) / (Largest Bankroll Drop)</em>
      </p>
      <hr />
      <p>
        <strong>Poor:</strong> &lt; 1.0
      </p>
      <p>
        <strong>Good:</strong> 1.0 - 2.99
      </p>
      <p>
        <strong>Excellent:</strong> &ge; 3.0
      </p>
    </div>
  );

  const legendPayload = [
    { value: "Dynamic Kelly", type: "line", color: "#ff7300" },
    { value: "Flat Stake", type: "line", color: "#82ca9d" },
    { value: "Static Kelly", type: "line", color: "#8884d8" },
  ];

  return (
    <div className="view-container analysis-view">
      <h2>Performance Analysis</h2>
      <FilterControls
        filters={filters}
        setFilters={setFilters}
        availableSports={availableSports}
        availableMarkets={availableMarkets}
      />
      {!stats ? (
        <div className="status-message">
          No graded picks match your current filters.
        </div>
      ) : (
        <>
          <div className="chart-container">
            <h3>Cumulative Performance (Units)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={stats.chartData}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-primary)"
                />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-primary)",
                  }}
                />
                <Legend payload={legendPayload} />
                <Line
                  type="monotone"
                  dataKey="dynamicUnits"
                  name="Dynamic Kelly"
                  stroke="#ff7300"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="benchmarkUnits"
                  name="Flat Stake"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="staticUnits"
                  name="Static Kelly"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="kpi-grid">
            <KpiCard
              title="Total P/L"
              value={`${
                stats.overall.totalPnl >= 0 ? "+" : ""
              }$${stats.overall.totalPnl.toFixed(2)}`}
              subtext={`vs. Flat: ${
                stats.overall.benchmarkPnl >= 0 ? "+" : ""
              }$${stats.overall.benchmarkPnl.toFixed(2)}`}
            />
            <KpiCard
              title="Total Units"
              value={`${
                stats.overall.totalUnits >= 0 ? "+" : ""
              }${stats.overall.totalUnits.toFixed(2)}`}
              subtext={`vs. Flat: ${
                stats.overall.benchmarkUnits >= 0 ? "+" : ""
              }${stats.overall.benchmarkUnits.toFixed(2)}`}
            />
            <KpiCard title="ROI" value={`${stats.overall.roi.toFixed(2)}%`} />
            <KpiCard
              title="Win Rate"
              value={`${stats.overall.winRate.toFixed(2)}%`}
              subtext={stats.overall.record}
            />
            <KpiCard
              title="Sharpe Ratio"
              value={
                isNaN(stats.overall.sharpeRatio)
                  ? "N/A"
                  : stats.overall.sharpeRatio.toFixed(2)
              }
              tooltip={sharpeTooltip}
            />
            <KpiCard
              title="Calmar Ratio"
              value={
                isNaN(stats.overall.calmarRatio)
                  ? "N/A"
                  : stats.overall.calmarRatio.toFixed(2)
              }
              tooltip={calmarTooltip}
            />
          </div>
          <div className="breakdown-section">
            <BreakdownTable
              title="Performance by Sport"
              data={stats.bySport}
              onRowClick={openPicksModal}
            />
            <BreakdownTable
              title="Performance by Market"
              data={stats.byMarket}
              onRowClick={openPicksModal}
            />
            <BreakdownTable
              title="Performance by Day of Week"
              data={stats.byDay}
              onRowClick={openPicksModal}
              sortBy="key"
            />
            <BreakdownTable
              title="Performance by Edge"
              data={stats.byEdge}
              onRowClick={openPicksModal}
              sortBy="key"
            />
            <BreakdownTable
              title="Performance by Bookmaker Count"
              data={stats.byBookmakerCount}
              onRowClick={openPicksModal}
              sortBy="key"
            />
            <BreakdownTable
              title="Performance by Time to Game"
              data={stats.byTimeToGame}
              onRowClick={openPicksModal}
              sortBy="key"
            />
          </div>
        </>
      )}
      {modalPicks && (
        <PicksModal
          title={modalPicks.title}
          picks={modalPicks.picks}
          onClose={closePicksModal}
          wagerType={filters.wagerType}
          kelly={filters.kelly}
        />
      )}
    </div>
  );
}

export default Analysis;
