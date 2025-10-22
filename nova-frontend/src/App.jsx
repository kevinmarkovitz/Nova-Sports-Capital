// src/App.jsx
import { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import EvBets from "./components/EvBets";
import CrossMarket from "./components/CrossMarket";
import SystemPicks from "./components/SystemPicks";
import OddsScreen from "./components/OddsScreen";
import Tracker from "./components/Tracker";
import Analysis from "./components/Analysis";
import OddsModal from "./components/OddsModal";
import TrackPlayModal from "./components/TrackPlayModal";
import { fetchGames, fetchProps } from "./helpers/api";
import "./App.css";

function App() {
  const [allGameData, setAllGameData] = useState(null);
  const [systemPicks, setSystemPicks] = useState([]);
  const [allPropData, setAllPropData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [modalData, setModalData] = useState(null);
  const [trackModalBet, setTrackModalBet] = useState(null);

  const [bankroll, setBankroll] = useState(() => {
    const savedBankroll = localStorage.getItem("userBankroll");
    return savedBankroll !== null ? JSON.parse(savedBankroll) : 10000;
  });

  const [kelly, setKelly] = useState(() => {
    const savedKelly = localStorage.getItem("userKellyMultiplier");
    return savedKelly !== null ? JSON.parse(savedKelly) : 0.5;
  });

  useEffect(() => {
    localStorage.setItem("userBankroll", JSON.stringify(bankroll));
  }, [bankroll]);

  useEffect(() => {
    localStorage.setItem("userKellyMultiplier", JSON.stringify(kelly));
  }, [kelly]);

  useEffect(() => {
    async function loadData() {
      try {
        const [gameData, historicalPicks, propData] = await Promise.all([
          fetchGames(),
          fetch("http://localhost:3001/api/system_picks").then((res) =>
            res.json()
          ),
          fetchProps(),
        ]);

        const now = new Date();
        const upcomingGames = gameData.games.filter(
          (g) => new Date(g.gameTime) > now
        );

        const picksMap = new Map();
        historicalPicks.forEach((pick) => {
          picksMap.set(pick.pickId, pick);
        });

        const mergedGames = upcomingGames.map((game) => {
          const gameWithHistory = { ...game, historicalMaxEdges: {} };
          ["moneyline", "spreads", "totals"].forEach((marketType) => {
            if (game[marketType]) {
              game[marketType].forEach((line) => {
                // --- START: BUG FIX ---
                // The point value from the API is the consistent key for the ID for BOTH sides.
                const idPoint = line.point;
                const pickIdentifierA = `${game.id}-${marketType}-${idPoint}-A`;
                const pickIdentifierB = `${game.id}-${marketType}-${idPoint}-B`;
                // --- END: BUG FIX ---

                if (picksMap.has(pickIdentifierA)) {
                  if (!gameWithHistory.historicalMaxEdges[marketType])
                    gameWithHistory.historicalMaxEdges[marketType] = {};
                  if (
                    !gameWithHistory.historicalMaxEdges[marketType][line.point]
                  )
                    gameWithHistory.historicalMaxEdges[marketType][line.point] =
                      {};
                  gameWithHistory.historicalMaxEdges[marketType][line.point].A =
                    picksMap.get(pickIdentifierA);
                }
                if (picksMap.has(pickIdentifierB)) {
                  if (!gameWithHistory.historicalMaxEdges[marketType])
                    gameWithHistory.historicalMaxEdges[marketType] = {};
                  if (
                    !gameWithHistory.historicalMaxEdges[marketType][line.point]
                  )
                    gameWithHistory.historicalMaxEdges[marketType][line.point] =
                      {};
                  gameWithHistory.historicalMaxEdges[marketType][line.point].B =
                    picksMap.get(pickIdentifierB);
                }
              });
            }
          });
          return gameWithHistory;
        });

        setAllGameData(mergedGames);
        setSystemPicks(historicalPicks);
        setAllPropData(
          propData.props.filter((p) => new Date(p.gameTime) > now)
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const openModal = (data) => setModalData(data);
  const closeModal = () => setModalData(null);
  const openTrackModal = (bet) => setTrackModalBet(bet);
  const closeTrackModal = () => setTrackModalBet(null);

  const handleSavePlay = (playToSave) => {
    const savedPlays = JSON.parse(localStorage.getItem("trackedPlays")) || [];
    const newPlay = {
      id: Date.now(),
      bet: playToSave.bet,
      odds: playToSave.odds,
      stake: playToSave.stake,
      status: "pending",
      gameTime: playToSave.gameTime,
    };
    const updatedPlays = [...savedPlays, newPlay].sort(
      (a, b) => new Date(b.gameTime) - new Date(a.gameTime)
    );
    localStorage.setItem("trackedPlays", JSON.stringify(updatedPlays));
    closeTrackModal();
    alert("Play saved to Tracker!");
  };

  const renderActiveView = () => {
    const viewProps = {
      games: allGameData,
      props: allPropData,
      systemPicks: systemPicks,
      openModal,
      openTrackModal,
      bankroll,
      setBankroll,
      kelly,
      setKelly,
    };
    switch (activeView) {
      case "ev-bets":
        return <EvBets {...viewProps} />;
      case "cross-market":
        return <CrossMarket {...viewProps} />;
      case "system":
        return <SystemPicks {...viewProps} />;
      case "odds":
        return <OddsScreen {...viewProps} />;
      case "tracker":
        return <Tracker />;
      case "analysis":
        return <Analysis />;
      case "dashboard":
      default:
        return <Dashboard {...viewProps} />;
    }
  };

  if (loading && !allGameData) {
    return <div className="status-message">Loading all market data...</div>;
  }
  if (error) {
    return <div className="status-message error">{error}</div>;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>NOVA Sports Capital</h1>
        <nav>
          <button
            onClick={() => setActiveView("dashboard")}
            className={activeView === "dashboard" ? "active" : ""}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveView("odds")}
            className={activeView === "odds" ? "active" : ""}
          >
            Odds Screen
          </button>
          <button
            onClick={() => setActiveView("ev-bets")}
            className={activeView === "ev-bets" ? "active" : ""}
          >
            +EV Bets
          </button>
          <button
            onClick={() => setActiveView("cross-market")}
            className={activeView === "cross-market" ? "active" : ""}
          >
            Cross-Market
          </button>
          <button
            onClick={() => setActiveView("system")}
            className={activeView === "system" ? "active" : ""}
          >
            System Picks
          </button>
          <button
            onClick={() => setActiveView("tracker")}
            className={activeView === "tracker" ? "active" : ""}
          >
            Tracker
          </button>
          <button
            onClick={() => setActiveView("analysis")}
            className={activeView === "analysis" ? "active" : ""}
          >
            Analysis
          </button>
        </nav>
      </header>
      <main>{renderActiveView()}</main>
      {modalData && <OddsModal data={modalData} onClose={closeModal} />}
      {trackModalBet && (
        <TrackPlayModal
          bet={trackModalBet}
          onClose={closeTrackModal}
          onSave={handleSavePlay}
        />
      )}
    </div>
  );
}

export default App;
