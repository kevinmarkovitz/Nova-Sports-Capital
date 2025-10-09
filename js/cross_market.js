// js/cross_market.js

import { App } from "./app.js";
import { OddsModal } from "./odds_modal.js";

export const CrossMarket = {
  state: {
    evBets: [], // State now holds EV bets
  },

  init() {
    const crossMarketTab = document.getElementById("tab-cross-market");
    if (crossMarketTab) {
      crossMarketTab.addEventListener("click", () => this.findEVBets(), {
        once: true,
      });
    }

    const controls = [
      "cross-market-sport-filter",
      "cross-market-min-diff",
      "cross-market-max-diff",
      "cross-market-search-filter",
      "cross-market-min-odds-filter",
      "cross-market-max-odds-filter",
      "cross-market-book-filter",
      "cross-market-market-filter",
    ];
    controls.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        const eventType = el.tagName === "SELECT" ? "change" : "input";
        el.addEventListener(eventType, () => this.renderEVBets());
      }
    });

    const slate = document.getElementById("cross-market-slate");
    if (slate) {
      slate.addEventListener("click", (e) => {
        const card = e.target.closest(".game-card");
        if (card && card.dataset.id) {
          this.handleCardClick(card);
        }
      });
    }
  },

  findEVBets() {
    this.state.evBets = [];
    const slate = document.getElementById("cross-market-slate");
    slate.innerHTML = `<p class="text-main-secondary text-center col-span-full">Analyzing sharp & soft markets for +EV bets...</p>`;

    // --- Process Game Lines ---
    App.state.allGameData.forEach((game) => {
      ["moneyline", "spreads", "totals"].forEach((marketKey) => {
        if (!game[marketKey]) return;
        const lines = Array.isArray(game[marketKey])
          ? game[marketKey]
          : [game[marketKey]];
        lines.forEach((line) => {
          if (!line.bookmakerOdds || line.bookmakerOdds.length < 2) return;

          let bestA = { odds: -Infinity, bookmaker: null, type: null };
          let bestB = { odds: -Infinity, bookmaker: null, type: null };
          line.bookmakerOdds.forEach((book) => {
            const odds = book.vigOdds || book.odds;
            if (odds) {
              if (odds.oddsA > bestA.odds)
                bestA = {
                  odds: odds.oddsA,
                  bookmaker: book.bookmaker,
                  type: book.type,
                };
              if (odds.oddsB > bestB.odds)
                bestB = {
                  odds: odds.oddsB,
                  bookmaker: book.bookmaker,
                  type: book.type,
                };
            }
          });

          const probA = App.helpers.americanToProb(bestA.odds);
          const probB = App.helpers.americanToProb(bestB.odds);
          const isArb = probA + probB < 1 && probA > 0 && probB > 0;
          const isCrossMarket =
            (bestA.type === "sharp" && bestB.type !== "sharp") ||
            (bestB.type === "sharp" && bestA.type !== "sharp");

          if (isArb && isCrossMarket) {
            const sharpSide = bestA.type === "sharp" ? bestA : bestB;
            const softSide = bestA.type === "sharp" ? bestB : bestA;
            const sharpBook = line.bookmakerOdds.find(
              (b) => b.bookmaker === sharpSide.bookmaker && b.vigOdds
            );
            const softBook = line.bookmakerOdds.find(
              (b) => b.bookmaker === softSide.bookmaker
            );

            if (!sharpBook || !softBook) return;

            const trueLine = App.helpers.calculateVigFreeLine(
              sharpBook.vigOdds
            );
            if (!trueLine) return;

            const softSideKey = softSide === bestA ? "A" : "B";
            const trueProb = App.helpers.americanToProb(
              softSideKey === "A" ? trueLine.oddsA : trueLine.oddsB
            );
            const ev =
              trueProb * App.helpers.americanToDecimal(softSide.odds) - 1;

            if (ev > 0) {
              this.state.evBets.push({
                type: "game",
                data: game,
                line,
                book: softBook,
                side: softSideKey,
                odds: softSide.odds,
                ev,
                trueProb,
                marketKey,
              });
            }
          }
        });
      });
    });

    // --- Process Player Props ---
    const propsByMarket = new Map();
    App.state.allPropData.forEach((prop) => {
      const marketId = `${prop.gameId}-${prop.market}-${prop.point}`;
      if (!propsByMarket.has(marketId)) {
        const gameForProp = App.state.allGameData.find(
          (g) => g.id === prop.gameId
        );
        propsByMarket.set(marketId, {
          prop,
          game: gameForProp || {
            id: prop.gameId,
            teamA: prop.teamA,
            teamB: prop.teamB,
            sport: prop.sport,
            gameTime: prop.gameTime,
          },
          books: [],
        });
      }
      propsByMarket.get(marketId).books.push(...prop.bookmakerOdds);
    });

    propsByMarket.forEach((marketData) => {
      if (!marketData.books || marketData.books.length < 2) return;

      let bestOver = { odds: -Infinity, bookmaker: null, type: null };
      let bestUnder = { odds: -Infinity, bookmaker: null, type: null };
      marketData.books.forEach((book) => {
        const odds = book.vigOdds || book.odds;
        if (odds && odds.over != null && odds.over > bestOver.odds) {
          bestOver = {
            odds: odds.over,
            bookmaker: book.bookmaker,
            type: book.type,
          };
        }
        if (odds && odds.under != null && odds.under > bestUnder.odds) {
          bestUnder = {
            odds: odds.under,
            bookmaker: book.bookmaker,
            type: book.type,
          };
        }
      });

      const probOver = App.helpers.americanToProb(bestOver.odds);
      const probUnder = App.helpers.americanToProb(bestUnder.odds);
      const isArb = probOver + probUnder < 1 && probOver > 0 && probUnder > 0;
      const isCrossMarket =
        (bestOver.type === "sharp" && bestUnder.type !== "sharp") ||
        (bestUnder.type === "sharp" && bestOver.type !== "sharp");

      if (isArb && isCrossMarket) {
        const sharpSide = bestOver.type === "sharp" ? bestOver : bestUnder;
        const softSide = bestOver.type === "sharp" ? bestUnder : bestOver;

        // CORRECTED LOGIC: Merge all partial odds for the sharp book to get a full line.
        const sharpBookEntries = marketData.books.filter(
          (b) => b.bookmaker === sharpSide.bookmaker && b.odds
        );
        if (sharpBookEntries.length === 0) return;

        const sharpBookLine = sharpBookEntries.reduce(
          (line, entry) => {
            if (entry.odds.over != null) line.over = entry.odds.over;
            if (entry.odds.under != null) line.under = entry.odds.under;
            return line;
          },
          { over: null, under: null }
        );

        if (sharpBookLine.over == null || sharpBookLine.under == null) return;

        const softBook = marketData.books.find(
          (b) => b.bookmaker === softSide.bookmaker
        );

        if (!softBook) return;

        const trueLine = App.helpers.calculateVigFreeLine({
          oddsA: sharpBookLine.over,
          oddsB: sharpBookLine.under,
        });
        if (!trueLine) return;

        const softIsOver = softSide === bestOver;
        const trueProb = App.helpers.americanToProb(
          softIsOver ? trueLine.oddsA : trueLine.oddsB
        );
        const ev = trueProb * App.helpers.americanToDecimal(softSide.odds) - 1;

        if (ev > 0) {
          this.state.evBets.push({
            type: "prop",
            data: marketData.prop,
            book: softBook,
            side: softIsOver ? "Over" : "Under",
            odds: softSide.odds,
            ev,
            trueProb,
            marketKey: marketData.prop.market,
          });
        }
      }
    });

    this._populateFilters();
    this.renderEVBets();
  },

  _populateFilters() {
    const sportSet = new Set(),
      bookSet = new Set(),
      marketSet = new Set();
    this.state.evBets.forEach((bet) => {
      sportSet.add(bet.data.sport);
      bookSet.add(bet.book.bookmaker);
      marketSet.add(bet.marketKey);
    });
    const createOptions = (set) =>
      Array.from(set)
        .sort()
        .map(
          (val) =>
            `<option value="${val}">${val
              .replace(/_/g, " ")
              .replace("spreads", "Spread")}</option>`
        )
        .join("");
    document.getElementById("cross-market-sport-filter").innerHTML =
      '<option value="all">All Sports</option>' + createOptions(sportSet);
    document.getElementById("cross-market-book-filter").innerHTML =
      '<option value="all">All Books</option>' + createOptions(bookSet);
    document.getElementById("cross-market-market-filter").innerHTML =
      '<option value="all">All Markets</option>' + createOptions(marketSet);
  },

  renderEVBets() {
    const slate = document.getElementById("cross-market-slate");
    slate.innerHTML = "";
    const minEv =
      (parseFloat(document.getElementById("cross-market-min-diff").value) ||
        0) / 100;
    const maxEvInput = document.getElementById("cross-market-max-diff");
    const maxEv = maxEvInput.value
      ? parseFloat(maxEvInput.value) / 100
      : Infinity;
    const selectedSport = document.getElementById(
      "cross-market-sport-filter"
    ).value;
    const searchTerm = document
      .getElementById("cross-market-search-filter")
      .value.toLowerCase();
    const minOdds =
      parseFloat(
        document.getElementById("cross-market-min-odds-filter").value
      ) || -Infinity;
    const maxOdds =
      parseFloat(
        document.getElementById("cross-market-max-odds-filter").value
      ) || Infinity;
    const selectedBook = document.getElementById(
      "cross-market-book-filter"
    ).value;
    const selectedMarket = document.getElementById(
      "cross-market-market-filter"
    ).value;

    const filteredBets = this.state.evBets.filter((bet) => {
      const evCondition = bet.ev >= minEv && bet.ev <= maxEv;
      const sportCondition =
        selectedSport === "all" || bet.data.sport === selectedSport;
      const oddsCondition = bet.odds >= minOdds && bet.odds <= maxOdds;
      const bookCondition =
        selectedBook === "all" || bet.book.bookmaker === selectedBook;
      const marketCondition =
        selectedMarket === "all" || bet.marketKey === selectedMarket;
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
      return (
        evCondition &&
        sportCondition &&
        oddsCondition &&
        bookCondition &&
        marketCondition &&
        searchCondition
      );
    });

    if (filteredBets.length === 0) {
      slate.innerHTML = `<p class="text-center text-main-secondary col-span-full">No Cross Market +EV bets found matching your criteria.</p>`;
      return;
    }

    filteredBets.sort((a, b) => b.ev - a.ev);
    filteredBets.forEach((bet) => {
      const card = this._createEVBetCard(bet);
      slate.appendChild(card);
    });
  },

  _createEVBetCard(bet) {
    const card = document.createElement("div");
    card.className = "game-card p-4 rounded-lg cursor-pointer";
    card.dataset.id = bet.type === "prop" ? bet.data.propId : bet.data.id;
    card.dataset.market = bet.marketKey;
    card.dataset.isProp = bet.type === "prop";
    card.dataset.point =
      bet.type === "game" && bet.line ? bet.line.point : bet.data.point;
    card.dataset.bookmaker = bet.book.bookmaker;
    card.dataset.side = bet.side;

    const logoSrc = `images/logos/${bet.book.bookmaker}.png`;
    let topHtml, bottomHtml;
    if (bet.type === "prop") {
      const prop = bet.data;
      const propMarketName = prop.market
        .replace("player_", "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      topHtml = `<p class="font-bold text-lg text-main-primary">${prop.player}</p><p class="text-sm text-main-secondary">${prop.teamB} @ ${prop.teamA}</p>`;
      const betDescription =
        prop.point !== null
          ? `${bet.side} ${prop.point} ${propMarketName}`
          : propMarketName;
      bottomHtml = `<p class="font-bold text-lg text-accent-blue">${betDescription}</p>`;
    } else {
      const game = bet.data;
      let sideName;
      if (bet.marketKey === "moneyline")
        sideName = bet.side === "A" ? game.teamA : game.teamB;
      else if (bet.marketKey === "spreads") {
        const point = bet.side === "A" ? bet.line.point : -bet.line.point;
        sideName = `${
          bet.side === "A" ? game.teamA : game.teamB
        } ${App.helpers.formatPoint(point)}`;
      } else {
        sideName = `${bet.side === "A" ? "Over" : "Under"} ${bet.line.point}`;
      }
      topHtml = `<p class="font-bold text-lg text-main-primary">${game.teamB} @ ${game.teamA}</p><p class="text-sm text-main-secondary">${game.sport}</p>`;
      bottomHtml = `<p class="font-bold text-lg text-accent-blue">${sideName}</p>`;
    }

    card.innerHTML = `<div class="flex justify-between items-start"><div class="flex-grow">${topHtml}</div><div class="text-right flex-shrink-0 ml-4 flex items-center space-x-3"><div><p class="font-semibold text-main-primary">${App.helpers.formatOdds(
      bet.odds
    )}</p><p class="text-sm text-main-secondary">${
      bet.book.bookmaker
    }</p></div><img src="${logoSrc}" alt="${
      bet.book.bookmaker
    }" class="h-10 w-10 object-contain rounded-md" onerror="this.style.display='none'"></div></div><div class="p-3 rounded-md mt-2" style="background-color: var(--bg-secondary);"><div class="flex justify-between items-center"><div>${bottomHtml}<div class="bg-green-500/20 rounded-full px-3 py-1 mt-1 inline-block"><p class="font-bold text-sm text-green-400">+${(
      bet.ev * 100
    ).toFixed(2)}% EV</p></div></div></div></div>`;
    return card;
  },

  handleCardClick(card) {
    const id = card.dataset.id;
    const marketType = card.dataset.market;
    const isProp = card.dataset.isProp === "true";
    const point = parseFloat(card.dataset.point);
    const bookmaker = card.dataset.bookmaker;
    const side = card.dataset.side;

    const bet = this.state.evBets.find(
      (b) =>
        (isProp ? b.data.propId === id : b.data.id === id) &&
        b.marketKey === marketType &&
        (isProp ? b.data.point : b.line.point) === point &&
        b.book.bookmaker === bookmaker &&
        b.side.toLowerCase() === side.toLowerCase()
    );

    if (!bet) {
      console.error(
        "Could not find the original EV bet data for the clicked card."
      );
      return;
    }

    const gameContext = bet.data;
    const lineData = bet.type === "prop" ? bet.data : bet.line;

    if (gameContext && lineData) {
      if (isProp) {
        const propsByMarket = new Map();
        App.state.allPropData.forEach((prop) => {
          const marketId = `${prop.gameId}-${prop.market}-${prop.point}`;
          if (!propsByMarket.has(marketId)) {
            propsByMarket.set(marketId, { books: [] });
          }
          propsByMarket.get(marketId).books.push(...prop.bookmakerOdds);
        });
        const marketId = `${bet.data.gameId}-${bet.data.market}-${bet.data.point}`;
        const fullBookList = propsByMarket.get(marketId)?.books || [];
        const modalLineData = { ...bet.data, bookmakerOdds: fullBookList };
        OddsModal.show(gameContext, modalLineData, marketType, isProp);
      } else {
        OddsModal.show(gameContext, lineData, marketType, isProp);
      }
    }
  },
};
