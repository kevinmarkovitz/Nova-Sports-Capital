// js/ev_bets.js

import { App } from "./app.js";
import { OddsModal } from "./odds_modal.js";

export const EVBets = {
  state: {
    evBets: [],
  },

  init() {
    // This new logic manages the member selector
    const memberSelector = document.getElementById("member-selector");
    if (memberSelector) {
      const savedMember = localStorage.getItem("selectedMember");
      if (savedMember) {
        memberSelector.value = savedMember;
      }
      memberSelector.addEventListener("change", () => {
        localStorage.setItem("selectedMember", memberSelector.value);
      });
    }

    const evBetsTab = document.getElementById("tab-ev-bets");
    if (evBetsTab) {
      evBetsTab.addEventListener(
        "click",
        () => this.processAndDisplayEVBets(),
        {
          once: true,
        }
      );
    }
    const controls = [
      "ev-bankroll",
      "ev-kelly-multiplier",
      "ev-book-filter",
      "ev-min-ev-filter",
      "ev-max-ev-filter",
      "ev-market-filter",
      "ev-min-odds-filter",
      "ev-max-odds-filter",
      "ev-search-filter",
    ];
    controls.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        const eventType = el.tagName === "SELECT" ? "change" : "input";
        el.addEventListener(eventType, () => this.renderEVBets());
      }
    });

    const slate = document.getElementById("ev-bets-slate");
    if (slate) {
      slate.addEventListener("click", (e) => {
        const card = e.target.closest(".game-card");
        if (card && card.dataset.id && !e.target.closest(".btn-track-sheet")) {
          this.handleEVCardClick(card);
        }
      });
    }
  },

  handleEVCardClick(card) {
    const id = card.dataset.id;
    const marketType = card.dataset.market;
    const isProp = card.dataset.isProp === "true";
    const point = parseFloat(card.dataset.point);

    const item = isProp
      ? App.state.allPropData.find((p) => p.propId === id)
      : App.state.allGameData.find((g) => g.id === id);

    if (!item) return;

    let lineData;
    if (isProp || marketType === "moneyline") {
      lineData = item;
    } else {
      lineData = item[marketType]?.find((l) => l.point === point);
    }

    if (lineData) {
      // Call the new, shared modal
      OddsModal.show(item, lineData, marketType, isProp);
    }
  },

  processAndDisplayEVBets() {
    const slate = document.getElementById("ev-bets-slate");
    slate.innerHTML = `<p class="text-main-secondary text-center">Scanning all markets for +EV bets...</p>`;
    try {
      this.calculateEVBets();
      this._populateFilters();
      this.renderEVBets();
    } catch (err) {
      console.error(err);
      slate.innerHTML = `<p class="text-center text-red-500">${err.message}</p>`;
    }
  },
  _populateFilters() {
    const bookSet = new Set(),
      marketSet = new Set();
    this.state.evBets.forEach((bet) => {
      bookSet.add(bet.book.bookmaker);
      marketSet.add(bet.marketKey);
    });
    const bookFilter = document.getElementById("ev-book-filter");
    bookFilter.innerHTML = '<option value="all">All Books</option>';
    Array.from(bookSet)
      .sort()
      .forEach((book) => {
        bookFilter.innerHTML += `<option value="${book}">${book}</option>`;
      });
    const marketFilter = document.getElementById("ev-market-filter");
    marketFilter.innerHTML = '<option value="all">All Markets</option>';
    Array.from(marketSet)
      .sort()
      .forEach((market) => {
        marketFilter.innerHTML += `<option value="${market}">${market.replace(
          /_/g,
          " "
        )}</option>`;
      });
  },

  calculateEVBets() {
    this.state.evBets = [];

    // Process Props
    App.state.allPropData.forEach((prop) => {
      // Use the new evTabTrueOdds if it exists, otherwise fall back to the original trueOdds
      const consensus = prop.evTabTrueOdds || prop.trueOdds;
      if (!consensus || !prop.bookmakerOdds) return;

      // Handle both two-way (Over/Under) and one-way (Yes/No) props
      const trueProbOver = consensus.over
        ? App.helpers.americanToProb(consensus.over)
        : prop.trueProb || null;
      const trueProbUnder = consensus.under
        ? App.helpers.americanToProb(consensus.under)
        : null;

      prop.bookmakerOdds.forEach((book) => {
        const odds = book.vigOdds || book.odds;
        if (odds && odds.over != null && trueProbOver) {
          const evOver =
            trueProbOver * App.helpers.americanToDecimal(odds.over) - 1;
          this.state.evBets.push({
            type: "prop",
            data: prop,
            book,
            side: "Over",
            odds: odds.over,
            ev: evOver,
            trueProb: trueProbOver,
            marketKey: prop.market,
          });
        }
        if (odds && odds.under != null && trueProbUnder) {
          const evUnder =
            trueProbUnder * App.helpers.americanToDecimal(odds.under) - 1;
          this.state.evBets.push({
            type: "prop",
            data: prop,
            book,
            side: "Under",
            odds: odds.under,
            ev: evUnder,
            trueProb: trueProbUnder,
            marketKey: prop.market,
          });
        }
      });
    });

    // Process Game Lines
    App.state.allGameData.forEach((game) => {
      ["moneyline", "spreads", "totals"].forEach((marketKey) => {
        if (!game[marketKey]) return;
        const lines = Array.isArray(game[marketKey])
          ? game[marketKey]
          : [game[marketKey]];
        lines.forEach((line) => {
          // Use the new evTabTrueOdds if it exists, otherwise fall back to the original trueOdds
          const consensus = line.evTabTrueOdds || line.trueOdds;
          if (!consensus || !line.bookmakerOdds) return;

          const trueProbA = App.helpers.americanToProb(consensus.oddsA);
          const trueProbB = App.helpers.americanToProb(consensus.oddsB);

          line.bookmakerOdds.forEach((book) => {
            if (book.vigOdds && book.vigOdds.oddsA != null) {
              const evA =
                trueProbA * App.helpers.americanToDecimal(book.vigOdds.oddsA) -
                1;
              this.state.evBets.push({
                type: "game",
                data: game,
                line,
                book,
                side: "A",
                odds: book.vigOdds.oddsA,
                ev: evA,
                trueProb: trueProbA,
                marketKey,
              });
            }
            if (book.vigOdds && book.vigOdds.oddsB != null) {
              const evB =
                trueProbB * App.helpers.americanToDecimal(book.vigOdds.oddsB) -
                1;
              this.state.evBets.push({
                type: "game",
                data: game,
                line,
                book,
                side: "B",
                odds: book.vigOdds.oddsB,
                ev: evB,
                trueProb: trueProbB,
                marketKey,
              });
            }
          });
        });
      });
    });
  },

  renderEVBets() {
    const slate = document.getElementById("ev-bets-slate");
    slate.innerHTML = "";

    const bankroll =
      parseFloat(document.getElementById("ev-bankroll").value) || 0;
    const kellyMultiplier =
      parseFloat(document.getElementById("ev-kelly-multiplier").value) || 0.5;
    const selectedBook = document.getElementById("ev-book-filter").value;
    const selectedMarket = document.getElementById("ev-market-filter").value;
    const searchTerm = document
      .getElementById("ev-search-filter")
      .value.toLowerCase();

    const minEv =
      (parseFloat(document.getElementById("ev-min-ev-filter").value) || 0) /
      100;
    const maxEvInput = document.getElementById("ev-max-ev-filter");
    const maxEv = maxEvInput.value
      ? parseFloat(maxEvInput.value) / 100
      : Infinity;

    // --- NEW: Get Min/Max odds values ---
    const minOddsInput = document.getElementById("ev-min-odds-filter");
    const maxOddsInput = document.getElementById("ev-max-odds-filter");
    const minOdds = minOddsInput.value
      ? parseFloat(minOddsInput.value)
      : -Infinity;
    const maxOdds = maxOddsInput.value
      ? parseFloat(maxOddsInput.value)
      : Infinity;

    const filteredBets = this.state.evBets.filter((bet) => {
      const evCondition = bet.ev >= minEv && bet.ev <= maxEv;
      const bookCondition =
        selectedBook === "all" || bet.book.bookmaker === selectedBook;
      const marketCondition =
        selectedMarket === "all" || bet.marketKey === selectedMarket;

      // --- NEW: Add odds condition to the filter ---
      const oddsCondition = bet.odds >= minOdds && bet.odds <= maxOdds;

      let searchCondition = true;
      if (searchTerm) {
        const teamA = bet.data.teamA.toLowerCase();
        const teamB = bet.data.teamB.toLowerCase();
        const player = (bet.data.player || "").toLowerCase();
        searchCondition =
          teamA.includes(searchTerm) ||
          teamB.includes(searchTerm) ||
          player.includes(searchTerm);
      }

      // --- NEW: Combine all conditions ---
      return (
        evCondition &&
        bookCondition &&
        marketCondition &&
        oddsCondition &&
        searchCondition
      );
    });

    if (filteredBets.length === 0) {
      slate.innerHTML = `<p class="text-center text-main-secondary">No +EV bets found matching your criteria.</p>`;
      return;
    }

    filteredBets.sort((a, b) => b.ev - a.ev);
    filteredBets.forEach((bet) => {
      const card = this.createEVBetCard(bet, bankroll, kellyMultiplier);
      slate.appendChild(card);
    });
  },
  createEVBetCard(bet, bankroll, kellyMultiplier) {
    const card = document.createElement("div");
    card.className = "game-card p-4 rounded-lg";
    card.dataset.id = bet.type === "prop" ? bet.data.propId : bet.data.id;
    card.dataset.market = bet.marketKey;
    card.dataset.isProp = bet.type === "prop";
    card.dataset.point =
      bet.type === "game" && bet.line ? bet.line.point : bet.data.point;

    const logoSrc = `images/logos/${bet.book.bookmaker}.png`;

    let topHtml,
      bottomHtml,
      stakeHtml = "",
      stakeValue = 0;
    if (bankroll > 0) {
      const p = bet.trueProb;
      const q = 1 - p;
      const b = App.helpers.americanToDecimal(bet.odds) - 1;
      if (b > 0) {
        const kellyFraction = ((b * p - q) / b) * kellyMultiplier;
        stakeValue = bankroll * kellyFraction;
        if (stakeValue > 0.01) {
          stakeHtml = `<div class="text-right"><p class="text-xl font-bold text-main-primary leading-none">$${stakeValue.toFixed(
            2
          )}</p><p class="text-xs text-main-secondary leading-none">(${(
            kellyFraction * 100
          ).toFixed(4)}% of bankroll)</p></div>`;
        }
      }
    }
    if (bet.type === "prop") {
      const prop = bet.data;
      const propMarketName = prop.market
        .replace("player_", "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      topHtml = `<p class="font-bold text-lg text-main-primary">${prop.player}</p><p class="text-sm text-main-secondary">${prop.teamB} @ ${prop.teamA}</p>`;
      bottomHtml = `<p class="font-bold text-lg text-accent-blue">${bet.side} ${prop.point} ${propMarketName}</p>`;
    } else {
      const game = bet.data;
      let sideName;
      if (bet.marketKey === "moneyline") {
        sideName = bet.side === "A" ? game.teamA : game.teamB;
      } else if (bet.marketKey === "spreads") {
        const point = bet.side === "A" ? bet.line.point : -bet.line.point;
        const teamName = bet.side === "A" ? game.teamA : game.teamB;
        sideName = `${teamName} ${App.helpers.formatPoint(point)}`;
      } else {
        sideName = `${bet.side === "A" ? "Over" : "Under"} ${bet.line.point}`;
      }
      topHtml = `<p class="font-bold text-lg text-main-primary">${game.teamB} @ ${game.teamA}</p><p class="text-sm text-main-secondary">${game.sport}</p>`;
      bottomHtml = `<p class="font-bold text-lg text-accent-blue">${sideName}</p>`;
    }

    const gameDescription = `${bet.data.teamB} @ ${bet.data.teamA}`;
    const betDescription = bottomHtml.replace(/<[^>]*>/g, "");

    card.innerHTML = `<div class="flex justify-between items-start cursor-pointer ev-card-clickable-area">
                        <div class="flex-grow">${topHtml}</div>
                        <div class="text-right flex-shrink-0 ml-4 flex items-center space-x-3">
                            <div>
                                <p class="font-semibold text-main-primary">${App.helpers.formatOdds(
                                  bet.odds
                                )}</p>
                                <p class="text-sm text-main-secondary">${
                                  bet.book.bookmaker
                                }</p>
                            </div>
                            <img src="${logoSrc}" alt="${
      bet.book.bookmaker
    }" class="h-10 w-10 object-contain rounded-md" onerror="this.style.display='none'">
                        </div>
                      </div>
                      <div class="p-3 rounded-md mt-2" style="background-color: var(--bg-secondary);">
                        <div class="flex justify-between items-center">
                            <div class="cursor-pointer ev-card-clickable-area">
                                ${bottomHtml}
                                <div class="bg-green-500/20 rounded-full px-3 py-1 mt-1 inline-block">
                                    <p class="font-bold text-sm text-green-400">+${(
                                      bet.ev * 100
                                    ).toFixed(2)}% EV</p>
                                </div>
                            </div>
                            <div class="flex flex-col items-end">
                                ${stakeHtml}
                                <button class="btn-track-sheet mt-2 px-3 py-1 bg-accent-blue text-white text-xs font-semibold rounded-md hover:bg-blue-500 transition"
                                    data-sport="${bet.data.sport}"
                                    data-game="${gameDescription}"
                                    data-bet="${betDescription}"
                                    data-odds="${bet.odds}"
                                    data-bookmaker="${bet.book.bookmaker}"
                                    data-ev="${(bet.ev * 100).toFixed(2)}"
                                    data-stake="${stakeValue.toFixed(2)}">
                                    Track to Sheet
                                </button>
                            </div>
                        </div>
                      </div>`;

    const trackBtn = card.querySelector(".btn-track-sheet");
    trackBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const btn = e.target;
      const selectedMember = document.getElementById("member-selector").value;

      // Format data for Airtable API
      const airtableData = {
        fields: {
          Timestamp: new Date().toISOString(),
          Sport: btn.dataset.sport,
          Game: btn.dataset.game,
          Bet: btn.dataset.bet,
          Odds: parseFloat(btn.dataset.odds),
          Bookmaker: btn.dataset.bookmaker,
          EV_Percent: parseFloat(btn.dataset.ev),
          Stake: parseFloat(btn.dataset.stake),
          Status: "Pending",
          Member: selectedMember,
        },
      };

      btn.textContent = "Saving...";
      btn.disabled = true;

      const { airtableApiKey, airtableBaseId, airtableTableName } = App.config;
      const url = `https://api.airtable.com/v0/${airtableBaseId}/${airtableTableName}`;

      fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${airtableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records: [airtableData] }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Airtable response was not ok");
          }
          return response.json();
        })
        .then(() => {
          btn.textContent = "Saved!";
          btn.classList.replace("bg-accent-blue", "bg-green-600");
        })
        .catch((error) => {
          console.error("Error tracking bet to Airtable:", error);
          btn.textContent = "Error!";
          btn.classList.replace("bg-accent-blue", "bg-red-600");
        });
    });

    card.querySelectorAll(".ev-card-clickable-area").forEach((area) => {
      area.addEventListener("click", () => this.handleEVCardClick(card));
    });

    return card;
  },
};
