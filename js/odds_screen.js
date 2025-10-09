import { App } from "./app.js";

export const OddsScreen = {
  state: {
    currentGame: null,
    currentMarket: null,
    sortConfig: { column: "bookmaker", direction: "asc" },
  },

  init() {
    document
      .getElementById("odds-screen-back-btn")
      .addEventListener("click", () => this.show(null));
    document
      .getElementById("vig-free-toggle")
      .addEventListener("change", () => this._render());
    document
      .getElementById("odds-screen-sport-filter")
      .addEventListener("change", () => this._render());
    document
      .getElementById("prop-search-input")
      .addEventListener("input", () => this._render());
    document
      .getElementById("market-select-dropdown")
      .addEventListener("change", (e) => {
        this.state.currentMarket = e.target.value;
        this._render();
      });

    const container = document.getElementById("odds-comparison-container");
    container.addEventListener("click", (e) => {
      const header = e.target.closest(".sortable-header");
      const gameCard = e.target.closest(".game-list-card");
      const accordionHeader = e.target.closest(".accordion-header");

      if (header) this.handleSort(header.dataset.sort);
      else if (gameCard) {
        const game = App.state.allGameData.find(
          (g) => g.id === gameCard.dataset.id
        );
        if (game) this.show(game);
      } else if (accordionHeader) {
        accordionHeader.classList.toggle("active");
        const content = accordionHeader.nextElementSibling;
        if (content.style.maxHeight) {
          content.style.maxHeight = null;
        } else {
          content.style.maxHeight = content.scrollHeight + "px";
        }
      }
    });

    this._populateSportFilter();
    this._render();
  },

  _populateSportFilter() {
    const sportFilter = document.getElementById("odds-screen-sport-filter");
    const sports = [
      ...new Set(App.state.allGameData.map((g) => g.sport)),
    ].sort();
    sportFilter.innerHTML = '<option value="all">All Sports</option>';
    sports.forEach((sport) => {
      sportFilter.innerHTML += `<option value="${sport}">${sport}</option>`;
    });
  },

  show(game, market = null) {
    this.state.currentGame = game;
    this.state.currentMarket = market;
    this.state.sortConfig = { column: "bookmaker", direction: "asc" };
    if (game && !market) {
      this.state.currentMarket = ["moneyline", "spreads", "totals"].find(
        (m) => game[m]
      );
    }
    document.getElementById("vig-free-toggle").checked = false;
    document.getElementById("prop-search-input").value = "";
    this._render();
  },

  handleSort(column) {
    let direction = "desc";
    if (this.state.sortConfig.column === column) {
      direction = this.state.sortConfig.direction === "asc" ? "desc" : "asc";
    } else if (column === "bookmaker") {
      direction = "asc";
    }
    this.state.sortConfig = { column, direction };
    this._render();
  },

  _render() {
    const titleEl = document.getElementById("odds-screen-title");
    const subtitleEl = document.getElementById("odds-screen-subtitle");
    const backBtn = document.getElementById("odds-screen-back-btn");
    const sportFilterContainer = document.getElementById(
      "sport-filter-container"
    );
    const vigToggleContainer = document.getElementById(
      "vig-free-toggle-container"
    );
    const marketNavWrapper = document.getElementById("market-nav-wrapper");

    if (this.state.currentGame) {
      backBtn.classList.remove("hidden");
      sportFilterContainer.classList.add("hidden");
      vigToggleContainer.classList.remove("hidden");
      marketNavWrapper.classList.remove("hidden");
      this._renderDetailView();
    } else {
      titleEl.textContent = "All Upcoming Games";
      subtitleEl.textContent = "Select a game to view detailed odds";
      backBtn.classList.add("hidden");
      sportFilterContainer.classList.remove("hidden");
      vigToggleContainer.classList.add("hidden");
      marketNavWrapper.classList.add("hidden");
      this._renderGameList();
    }
  },

  _renderGameList() {
    const container = document.getElementById("odds-comparison-container");
    container.innerHTML = "";
    const selectedSport = document.getElementById(
      "odds-screen-sport-filter"
    ).value;
    const games = App.state.allGameData.filter(
      (g) => selectedSport === "all" || g.sport === selectedSport
    );
    if (games.length === 0) {
      container.innerHTML = `<p class="text-center text-main-secondary">No upcoming games found for this sport.</p>`;
      return;
    }
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
    games
      .sort((a, b) => new Date(a.gameTime) - new Date(b.gameTime))
      .forEach((game) => {
        grid.appendChild(this._createGameListCard(game));
      });
    container.appendChild(grid);
  },

  _createGameListCard(game) {
    const card = document.createElement("div");
    card.className =
      "game-list-card bg-tertiary p-4 rounded-lg cursor-pointer hover:bg-main-secondary transition";
    card.dataset.id = game.id;
    const logoA = App.helpers.getTeamLogoPath(game.teamA, game.sport);
    const logoB = App.helpers.getTeamLogoPath(game.teamB, game.sport);
    let oddsHtml = "";
    const moneyline = game.moneyline && game.moneyline[0];
    const spreads = game.spreads;
    let lineToUse = moneyline
      ? moneyline
      : spreads && spreads.length > 0
      ? spreads.reduce((prev, curr) =>
          (curr.bookmakerOdds?.length || 0) > (prev.bookmakerOdds?.length || 0)
            ? curr
            : prev
        )
      : null;
    let marketType = moneyline ? "moneyline" : spreads ? "spreads" : "";
    if (lineToUse && lineToUse.bookmakerOdds) {
      let bestOddsA = { price: -Infinity, bookmaker: "" };
      let bestOddsB = { price: -Infinity, bookmaker: "" };
      lineToUse.bookmakerOdds.forEach((book) => {
        const odds = book.vigOdds;
        if (
          odds &&
          odds.oddsA != null &&
          App.helpers.americanToDecimal(odds.oddsA) >
            App.helpers.americanToDecimal(bestOddsA.price)
        )
          bestOddsA = { price: odds.oddsA, bookmaker: book.bookmaker };
        if (
          odds &&
          odds.oddsB != null &&
          App.helpers.americanToDecimal(odds.oddsB) >
            App.helpers.americanToDecimal(bestOddsB.price)
        )
          bestOddsB = { price: odds.oddsB, bookmaker: book.bookmaker };
      });
      if (bestOddsA.bookmaker && bestOddsB.bookmaker) {
        let labelA, labelB;
        if (marketType === "moneyline") {
          labelA = `${game.teamA} ML`;
          labelB = `${game.teamB} ML`;
        } else {
          labelA = `${game.teamA} ${App.helpers.formatPoint(lineToUse.point)}`;
          labelB = `${game.teamB} ${App.helpers.formatPoint(-lineToUse.point)}`;
        }
        const logoSrcA = `images/logos/${bestOddsA.bookmaker}.png`;
        const logoSrcB = `images/logos/${bestOddsB.bookmaker}.png`;
        oddsHtml = `<div class="mt-3 pt-3 border-t border-border-primary text-sm text-main-secondary"><div class="flex justify-between items-center"><span class="truncate pr-2">${labelB}</span><div class="flex items-center gap-2"><span class="font-bold text-lg text-main-primary">${App.helpers.formatOdds(
          bestOddsB.price
        )}</span><img src="${logoSrcB}" alt="${
          bestOddsB.bookmaker
        }" class="h-6 w-6 object-contain" onerror="this.style.display='none'"></div></div><div class="flex justify-between items-center mt-1"><span class="truncate pr-2">${labelA}</span><div class="flex items-center gap-2"><span class="font-bold text-lg text-main-primary">${App.helpers.formatOdds(
          bestOddsA.price
        )}</span><img src="${logoSrcA}" alt="${
          bestOddsA.bookmaker
        }" class="h-6 w-6 object-contain" onerror="this.style.display='none'"></div></div></div>`;
      }
    }
    card.innerHTML = `<div class="flex items-center justify-between"><div><div class="flex items-center"><img src="${logoB}" class="h-8 w-8 mr-3 object-contain"><span class="font-bold text-main-primary">${
      game.teamB
    }</span></div><div class="flex items-center mt-2"><img src="${logoA}" class="h-8 w-8 mr-3 object-contain"><span class="font-bold text-main-primary">@ ${
      game.teamA
    }</span></div></div><div class="text-right text-xs text-main-secondary"><p>${
      game.sport
    }</p><p>${new Date(game.gameTime).toLocaleDateString()}</p><p>${new Date(
      game.gameTime
    ).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}</p></div></div>${oddsHtml}`;
    return card;
  },

  _renderDetailView() {
    const game = this.state.currentGame;
    const activeMarket = this.state.currentMarket;
    const allPropsForGame = App.state.allPropData.filter(
      (p) => p.gameId === game.id
    );
    document.getElementById(
      "odds-screen-title"
    ).textContent = `${game.teamB} @ ${game.teamA}`;
    document.getElementById("odds-screen-subtitle").textContent = new Date(
      game.gameTime
    ).toLocaleString([], { dateStyle: "full", timeStyle: "short" });
    document.getElementById("market-select-dropdown").innerHTML =
      this._buildMarketDropdown(game, allPropsForGame, activeMarket);
    const container = document.getElementById("odds-comparison-container");
    container.innerHTML = "";
    const isGameLine = ["moneyline", "spreads", "totals"].includes(
      activeMarket
    );
    if (isGameLine) {
      document.getElementById("prop-search-input").classList.add("hidden");
      this._renderGameMarketView(game, activeMarket);
    } else {
      document.getElementById("prop-search-input").classList.remove("hidden");
      this._renderPropMarketView(game, allPropsForGame, activeMarket);
    }
  },

  _buildMarketDropdown(game, props, activeMarket) {
    let markets = [];
    if (game.moneyline) markets.push({ key: "moneyline", name: "Moneyline" });
    if (game.spreads) markets.push({ key: "spreads", name: "Spreads" });
    if (game.totals) markets.push({ key: "totals", name: "Totals" });
    const propMarkets = [...new Set(props.map((p) => p.market))].sort();
    propMarkets.forEach((marketKey) => {
      const name = marketKey
        .replace(/player_|_alternate/g, " ")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
        .trim();
      markets.push({ key: marketKey, name });
    });
    const gameLineMarkets = markets.filter((m) =>
      ["moneyline", "spreads", "totals"].includes(m.key)
    );
    const playerPropMarkets = markets.filter(
      (m) => !gameLineMarkets.some((gl) => gl.key === m.key)
    );
    let html = "";
    if (gameLineMarkets.length > 0) {
      html += '<optgroup label="Game Lines">';
      html += gameLineMarkets
        .map(
          (market) =>
            `<option value="${market.key}" ${
              market.key === activeMarket ? "selected" : ""
            }>${market.name}</option>`
        )
        .join("");
      html += "</optgroup>";
    }
    if (playerPropMarkets.length > 0) {
      html += '<optgroup label="Player Props">';
      html += playerPropMarkets
        .map(
          (market) =>
            `<option value="${market.key}" ${
              market.key === activeMarket ? "selected" : ""
            }>${market.name}</option>`
        )
        .join("");
      html += "</optgroup>";
    }
    return html;
  },

  _renderGameMarketView(game, marketType) {
    const container = document.getElementById("odds-comparison-container");
    const allLines = (
      Array.isArray(game[marketType]) ? game[marketType] : [game[marketType]]
    ).filter(Boolean);
    if (allLines.length === 0) return;
    if (marketType === "moneyline") {
      const lineData = allLines[0];
      container.insertAdjacentHTML(
        "beforeend",
        this._buildAnalyticsPanel(lineData, game, marketType, false)
      );
      container.insertAdjacentHTML(
        "beforeend",
        this._buildTableHTML(lineData.bookmakerOdds, game, marketType, lineData)
      );
    } else {
      allLines.sort((a, b) => a.point - b.point);
      const mainLine = allLines.reduce((prev, curr) =>
        (curr.bookmakerOdds?.length || 0) > (prev.bookmakerOdds?.length || 0)
          ? curr
          : prev
      );
      const mainLineHeader = document.createElement("h3");
      mainLineHeader.className =
        "text-xl font-bold text-main-primary mb-3 border-b border-border-primary pb-2";
      mainLineHeader.textContent = `Main ${
        marketType === "spreads" ? "Spread" : "Total"
      }: ${App.helpers.formatPoint(mainLine.point)}`;
      container.appendChild(mainLineHeader);
      container.insertAdjacentHTML(
        "beforeend",
        this._buildAnalyticsPanel(mainLine, game, marketType, false)
      );
      container.insertAdjacentHTML(
        "beforeend",
        this._buildTableHTML(mainLine.bookmakerOdds, game, marketType, mainLine)
      );
      const altLines = allLines.filter((line) => line.point !== mainLine.point);
      if (altLines.length > 0) {
        const altHeader = document.createElement("h3");
        altHeader.className =
          "text-lg font-semibold text-main-secondary mt-8 mb-2";
        altHeader.textContent = "Alternate Lines";
        container.appendChild(altHeader);
        altLines.forEach((lineData) => {
          const accordion = document.createElement("div");
          const headerText = `Alternate ${
            marketType === "spreads" ? "Spread" : "Total"
          }: ${App.helpers.formatPoint(lineData.point)}`;
          accordion.innerHTML = `
                    <div class="accordion-header">
                        <span class="font-medium text-main-primary">${headerText}</span>
                        <span class="accordion-toggle"></span>
                    </div>
                    <div class="accordion-content">
                        <div class="p-4">
                            ${this._buildAnalyticsPanel(
                              lineData,
                              game,
                              marketType,
                              false
                            )}
                            ${this._buildTableHTML(
                              lineData.bookmakerOdds,
                              game,
                              marketType,
                              lineData
                            )}
                        </div>
                    </div>
                `;
          container.appendChild(accordion);
        });
      }
    }
  },

  _renderPropMarketView(game, allProps, marketType) {
    const container = document.getElementById("odds-comparison-container");
    const searchTerm = document
      .getElementById("prop-search-input")
      .value.toLowerCase();

    let propsForMarket = allProps.filter((p) => p.market === marketType);
    if (searchTerm)
      propsForMarket = propsForMarket.filter((p) =>
        p.player.toLowerCase().includes(searchTerm)
      );
    propsForMarket.sort(
      (a, b) => a.player.localeCompare(b.player) || a.point - b.point
    );

    if (propsForMarket.length === 0) {
      container.innerHTML = `<p class="text-center text-main-secondary">No props found for this market matching your search.</p>`;
      return;
    }

    propsForMarket.forEach((propData) => {
      const header = document.createElement("h3");
      header.className =
        "text-xl font-bold text-main-primary mt-6 mb-3 border-b border-border-primary pb-2";
      header.textContent = `${propData.player} - ${App.helpers.formatPoint(
        propData.point
      )}`;
      container.appendChild(header);
      container.insertAdjacentHTML(
        "beforeend",
        this._buildAnalyticsPanel(propData, game, marketType, true)
      );
      container.insertAdjacentHTML(
        "beforeend",
        this._buildTableHTML(propData.bookmakerOdds, propData, "prop")
      );
    });
  },

  // UPDATED: This function builds the new, simplified analytics panel.
  _buildAnalyticsPanel(lineData, item, marketType, isProp) {
    if (
      !lineData ||
      !lineData.bookmakerOdds ||
      lineData.bookmakerOdds.length === 0
    )
      return "";

    let bestOddsA = { price: -Infinity, bookmaker: "" };
    let bestOddsB = { price: -Infinity, bookmaker: "" };
    lineData.bookmakerOdds.forEach((book) => {
      const odds = book.vigOdds || book.odds;
      const oA = isProp ? odds?.over : odds?.oddsA;
      const oB = isProp ? odds?.under : odds?.oddsB;
      if (
        oA != null &&
        App.helpers.americanToDecimal(oA) >
          App.helpers.americanToDecimal(bestOddsA.price)
      )
        bestOddsA = { price: oA, bookmaker: book.bookmaker };
      if (
        oB != null &&
        App.helpers.americanToDecimal(oB) >
          App.helpers.americanToDecimal(bestOddsB.price)
      )
        bestOddsB = { price: oB, bookmaker: book.bookmaker };
    });

    let sideA_label_text, sideB_label_text;
    if (isProp) {
      sideA_label_text = `Over ${lineData.point}`;
      sideB_label_text = `Under ${lineData.point}`;
    } else {
      sideA_label_text =
        marketType === "moneyline"
          ? item.teamA
          : marketType === "spreads"
          ? `${item.teamA} ${App.helpers.formatPoint(lineData.point)}`
          : `Over ${lineData.point}`;
      sideB_label_text =
        marketType === "moneyline"
          ? item.teamB
          : marketType === "spreads"
          ? `${item.teamB} ${App.helpers.formatPoint(-lineData.point)}`
          : `Under ${lineData.point}`;
    }

    const logoSrcA = `images/logos/${bestOddsA.bookmaker}.png`;
    const logoSrcB = `images/logos/${bestOddsB.bookmaker}.png`;

    return `
        <div class="border border-border-primary rounded-lg p-3 bg-tertiary mb-4">
            <h4 class="text-sm font-semibold text-main-secondary mb-3 text-center">Best Available Prices</h4>
            <div class="grid grid-cols-2 gap-4">
                <div class="text-center">
                    <div class="text-xs text-main-secondary mb-1">${sideA_label_text}</div>
                    <div class="flex items-center justify-center gap-2">
                        <span class="font-bold text-lg text-main-primary">${App.helpers.formatOdds(
                          bestOddsA.price
                        )}</span>
                        <img src="${logoSrcA}" alt="${
      bestOddsA.bookmaker
    }" class="h-6 w-6 object-contain" onerror="this.style.display='none'">
                    </div>
                </div>
                <div class="text-center">
                    <div class="text-xs text-main-secondary mb-1">${sideB_label_text}</div>
                    <div class="flex items-center justify-center gap-2">
                        <span class="font-bold text-lg text-main-primary">${App.helpers.formatOdds(
                          bestOddsB.price
                        )}</span>
                        <img src="${logoSrcB}" alt="${
      bestOddsB.bookmaker
    }" class="h-6 w-6 object-contain" onerror="this.style.display='none'">
                    </div>
                </div>
            </div>
        </div>`;
  },

  _buildTableHTML(bookmakerData, item, marketType, lineData = null) {
    const sortConfig = this.state.sortConfig;
    const showVigFree = document.getElementById("vig-free-toggle").checked;
    const dataWithTrueOdds = bookmakerData.map((book) => {
      const oddsForVig = book.vigOdds || book.odds;
      let trueOdds = null;
      if (oddsForVig) {
        const oddsA =
          oddsForVig.oddsA !== undefined ? oddsForVig.oddsA : oddsForVig.over;
        const oddsB =
          oddsForVig.oddsB !== undefined ? oddsForVig.oddsB : oddsForVig.under;
        if (oddsA != null && oddsB != null)
          trueOdds = App.helpers.calculateVigFreeLine({ oddsA, oddsB });
      }
      return { ...book, trueOdds };
    });
    const sortedBooks = [...dataWithTrueOdds].sort((a, b) => {
      const oddsA = showVigFree ? a.trueOdds : a.vigOdds || a.odds;
      const oddsB = showVigFree ? b.trueOdds : b.vigOdds || b.odds;
      if (!oddsA || !oddsB) return 0;
      let valA, valB;
      if (sortConfig.column === "bookmaker") {
        valA = a.bookmaker;
        valB = b.bookmaker;
      } else {
        const sideKey = sortConfig.column === "sideA" ? "oddsA" : "oddsB";
        const propKey = sortConfig.column === "sideA" ? "over" : "under";
        valA = App.helpers.americanToDecimal(
          oddsA[sideKey] !== undefined ? oddsA[sideKey] : oddsA[propKey]
        );
        valB = App.helpers.americanToDecimal(
          oddsB[sideKey] !== undefined ? oddsB[sideKey] : oddsB[propKey]
        );
      }
      if (valA == null)
        valA = sortConfig.direction === "asc" ? Infinity : -Infinity;
      if (valB == null)
        valB = sortConfig.direction === "asc" ? Infinity : -Infinity;
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    const getSortIndicator = (column) =>
      sortConfig.column === column
        ? sortConfig.direction === "asc"
          ? " ▲"
          : " ▼"
        : "";
    let headerA, headerB;
    if (marketType === "prop") {
      headerA = `<span>Over ${item.point}</span>`;
      headerB = `<span>Under ${item.point}</span>`;
    } else {
      if (marketType === "moneyline") {
        headerA = `<span>${item.teamA}</span>`;
        headerB = `<span>${item.teamB}</span>`;
      } else {
        const point = lineData.point;
        headerA = `<span>${
          marketType === "spreads" ? item.teamA : "Over"
        } ${App.helpers.formatPoint(point)}</span>`;
        headerB = `<span>${
          marketType === "spreads" ? item.teamB : "Under"
        } ${App.helpers.formatPoint(
          marketType === "spreads" ? -point : point
        )}</span>`;
      }
    }
    const rowsHTML = sortedBooks
      .map((book) => this.createTableRow(book, showVigFree))
      .join("");
    return `<table class="w-full text-left table-auto border-collapse odds-table"><thead><tr><th class="p-2 w-1/3 text-sm font-semibold text-main-secondary sortable-header cursor-pointer" data-sort="bookmaker">Bookmaker${getSortIndicator(
      "bookmaker"
    )}</th><th class="p-2 w-1/3 text-sm font-semibold text-main-secondary text-center sortable-header cursor-pointer" data-sort="sideA">${headerA}${getSortIndicator(
      "sideA"
    )}</th><th class="p-2 w-1/3 text-sm font-semibold text-main-secondary text-center sortable-header cursor-pointer" data-sort="sideB">${headerB}${getSortIndicator(
      "sideB"
    )}</th></tr></thead><tbody>${rowsHTML}</tbody></table>`;
  },

  createTableRow(book, showVigFree) {
    const oddsToDisplay =
      showVigFree && book.trueOdds ? book.trueOdds : book.vigOdds || book.odds;
    if (!oddsToDisplay) return "";
    const oddsA =
      oddsToDisplay.oddsA !== undefined
        ? oddsToDisplay.oddsA
        : oddsToDisplay.over;
    const oddsB =
      oddsToDisplay.oddsB !== undefined
        ? oddsToDisplay.oddsB
        : oddsToDisplay.under;
    if (oddsA == null && oddsB == null) return "";
    let vigText = "Vig: --";
    if (
      !showVigFree &&
      book.vigOdds &&
      book.vigOdds.oddsA != null &&
      book.vigOdds.oddsB != null
    ) {
      const vig = App.helpers.calculateVig(
        book.vigOdds.oddsA,
        book.vigOdds.oddsB
      );
      vigText = `Vig: ${(vig * 100).toFixed(2)}%`;
    }
    const sharpIndicator =
      book.type === "sharp"
        ? '<span class="text-xs text-accent-red font-bold" title="Sharp Bookmaker"> S</span>'
        : "";
    const logoSrc = `images/logos/${book.bookmaker}.png`;
    const oddsAHTML =
      oddsA != null
        ? App.helpers.formatOdds(oddsA)
        : '<span class="text-main-secondary">-</span>';
    const oddsBHTML =
      oddsB != null
        ? App.helpers.formatOdds(oddsB)
        : '<span class="text-main-secondary">-</span>';
    return `<tr class="border-b border-border-primary"><td class="p-3 text-main-primary font-medium"><div class="flex items-center space-x-3"><img src="${logoSrc}" alt="${book.bookmaker}" class="h-8 w-8 object-contain" onerror="this.style.display='none'"><div><span>${book.bookmaker}${sharpIndicator}</span><span class="block text-xs text-main-secondary">${vigText}</span></div></div></td><td class="p-3 text-center"><span class="font-bold text-lg text-main-primary">${oddsAHTML}</span></td><td class="p-3 text-center"><span class="font-bold text-lg text-main-primary">${oddsBHTML}</span></td></tr>`;
  },
};
