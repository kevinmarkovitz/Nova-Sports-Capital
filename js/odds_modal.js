// js/odds_modal.js

import { App } from "./app.js";

export const OddsModal = {
  state: {
    modalSortConfig: { column: "bookmaker", direction: "asc" },
  },

  show(item, lineData, marketType, isProp) {
    const modal = document.getElementById("odds-modal");
    const titleEl = document.getElementById("odds-modal-title");
    const subtitleEl = document.getElementById("odds-modal-subtitle");
    const summaryContainer = document.getElementById(
      "odds-modal-consensus-summary"
    );
    const tableContainer = document.getElementById(
      "odds-modal-table-container"
    );
    const closeBtn = document.getElementById("odds-modal-close-btn");
    const vigToggle = document.getElementById("modal-vig-free-toggle");

    this.state.modalSortConfig = { column: "bookmaker", direction: "asc" };
    if (vigToggle) vigToggle.checked = false;

    if (isProp) {
      titleEl.textContent = lineData.player;
      const marketName = marketType
        .replace(/player_|_over_under/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
        .trim();
      subtitleEl.textContent = `${marketName} (${lineData.point}) - ${item.teamB} @ ${item.teamA}`;
    } else {
      titleEl.textContent = `${item.teamB} @ ${item.teamA}`;
      const marketName =
        marketType.charAt(0).toUpperCase() + marketType.slice(1);
      const pointText =
        marketType !== "moneyline" ? ` (${lineData.point})` : "";
      subtitleEl.textContent = `${marketName}${pointText}`;
    }

    summaryContainer.innerHTML = "";
    const trueOdds = lineData.trueOdds;
    const trueMarketOdds = lineData.trueMarketOdds;

    if (trueOdds && trueMarketOdds) {
      let sideA_label,
        sideB_label,
        trueOddsA,
        trueOddsB,
        marketOddsA,
        marketOddsB;
      if (isProp) {
        sideA_label = `Over ${lineData.point}`;
        sideB_label = `Under ${lineData.point}`;
        trueOddsA = trueOdds.over;
        trueOddsB = trueOdds.under;
        marketOddsA = trueMarketOdds.over;
        marketOddsB = trueMarketOdds.under;
      } else {
        const logoA_path = App.helpers.getTeamLogoPath(item.teamA, item.sport);
        const logoB_path = App.helpers.getTeamLogoPath(item.teamB, item.sport);
        if (marketType === "moneyline") {
          sideA_label = `<div class="flex items-center"><img src="${logoA_path}" class="h-11 w-11 mr-2 object-contain"><span>${item.teamA}</span></div>`;
          sideB_label = `<div class="flex items-center"><img src="${logoB_path}" class="h-11 w-11 mr-2 object-contain"><span>${item.teamB}</span></div>`;
        } else if (marketType === "spreads") {
          sideA_label = `<div class="flex items-center"><img src="${logoA_path}" class="h-11 w-11 mr-2 object-contain"><span>${
            item.teamA
          } ${App.helpers.formatPoint(lineData.point)}</span></div>`;
          sideB_label = `<div class="flex items-center"><img src="${logoB_path}" class="h-11 w-11 mr-2 object-contain"><span>${
            item.teamB
          } ${App.helpers.formatPoint(-lineData.point)}</span></div>`;
        } else {
          sideA_label = `Over ${lineData.point}`;
          sideB_label = `Under ${lineData.point}`;
        }
        trueOddsA = trueOdds.oddsA;
        trueOddsB = trueOdds.oddsB;
        marketOddsA = trueMarketOdds.oddsA;
        marketOddsB = trueMarketOdds.oddsB;
      }

      const probTrueA = App.helpers.americanToProb(trueOddsA);
      const probTrueB = App.helpers.americanToProb(trueOddsB);
      const probMarketA = App.helpers.americanToProb(marketOddsA);
      const probMarketB = App.helpers.americanToProb(marketOddsB);

      const summaryHTML = `
            <div class="border border-border-primary rounded-lg p-3 bg-tertiary">
              <table class="w-full text-center">
                <thead>
                  <tr>
                    <th class="w-1/3"></th>
                    <th class="w-1/3 text-sm font-semibold text-main-secondary pb-2">The Nova Line</th>
                    <th class="w-1/3 text-sm font-semibold text-main-secondary pb-2">Market Consensus</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="text-sm font-semibold text-main-primary text-left">${sideA_label}</td>
                    <td>
                      <p class="font-bold text-main-primary">${App.helpers.formatDecimalOdds(
                        trueOddsA
                      )}</p>
                      <p class="text-xs text-main-secondary">(${(
                        probTrueA * 100
                      ).toFixed(2)}%)</p>
                    </td>
                    <td>
                      <p class="font-bold text-main-primary">${App.helpers.formatDecimalOdds(
                        marketOddsA
                      )}</p>
                      <p class="text-xs text-main-secondary">(${(
                        probMarketA * 100
                      ).toFixed(2)}%)</p>
                    </td>
                  </tr>
                  <tr>
                    <td class="text-sm font-semibold text-main-primary text-left pt-2">${sideB_label}</td>
                    <td class="pt-2">
                      <p class="font-bold text-main-primary">${App.helpers.formatDecimalOdds(
                        trueOddsB
                      )}</p>
                      <p class="text-xs text-main-secondary">(${(
                        probTrueB * 100
                      ).toFixed(2)}%)</p>
                    </td>
                    <td class="pt-2">
                      <p class="font-bold text-main-primary">${App.helpers.formatDecimalOdds(
                        marketOddsB
                      )}</p>
                      <p class="text-xs text-main-secondary">(${(
                        probMarketB * 100
                      ).toFixed(2)}%)</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
        `;
      summaryContainer.innerHTML = summaryHTML;
    }

    const renderTable = () => {
      tableContainer.innerHTML = this._buildOddsComparisonTable(
        item,
        lineData,
        marketType,
        isProp
      );
    };
    renderTable();

    const vigToggleListener = () => renderTable();
    const sortListener = (e) => {
      const header = e.target.closest(".sortable-header");
      if (header) {
        const column = header.dataset.sort;
        let direction = "desc";
        if (this.state.modalSortConfig.column === column) {
          direction =
            this.state.modalSortConfig.direction === "asc" ? "desc" : "asc";
        } else if (column === "bookmaker") {
          direction = "asc";
        }
        this.state.modalSortConfig = { column, direction };
        renderTable();
      }
    };
    tableContainer.addEventListener("click", sortListener);
    vigToggle.addEventListener("change", vigToggleListener);

    modal.classList.remove("hidden");
    const closeModal = () => {
      modal.classList.add("hidden");
      tableContainer.removeEventListener("click", sortListener);
      vigToggle.removeEventListener("change", vigToggleListener);
    };
    closeBtn.addEventListener("click", closeModal, { once: true });
    modal.addEventListener(
      "click",
      (e) => {
        if (e.target === modal) closeModal();
      },
      { once: true }
    );
  },

  _buildOddsComparisonTable(item, lineData, marketType, isProp) {
    const bookmakerData = lineData?.bookmakerOdds || [];
    const bookmakerMap = new Map();
    for (const book of bookmakerData) {
      if (!bookmakerMap.has(book.bookmaker)) {
        bookmakerMap.set(book.bookmaker, JSON.parse(JSON.stringify(book)));
      } else {
        const existingEntry = bookmakerMap.get(book.bookmaker);
        if (book.odds) {
          if (!existingEntry.odds) existingEntry.odds = {};
          if (book.odds.over != null) existingEntry.odds.over = book.odds.over;
          if (book.odds.under != null)
            existingEntry.odds.under = book.odds.under;
        }
        if (book.vigOdds) {
          if (!existingEntry.vigOdds) existingEntry.vigOdds = {};
          if (book.vigOdds.oddsA != null)
            existingEntry.vigOdds.oddsA = book.vigOdds.oddsA;
          if (book.vigOdds.oddsB != null)
            existingEntry.vigOdds.oddsB = book.vigOdds.oddsB;
        }
      }
    }
    const uniqueBookmakerData = Array.from(bookmakerMap.values());
    const dataWithTrueOdds = uniqueBookmakerData.map((book) => {
      const oddsForVig = book.vigOdds || book.odds;
      let trueOdds = null;
      if (oddsForVig) {
        const oddsA =
          oddsForVig.oddsA !== undefined ? oddsForVig.oddsA : oddsForVig.over;
        const oddsB =
          oddsForVig.oddsB !== undefined ? oddsForVig.oddsB : oddsForVig.under;
        if (oddsA != null && oddsB != null) {
          trueOdds = App.helpers.calculateVigFreeLine({ oddsA, oddsB });
        }
      }
      return { ...book, trueOdds };
    });

    const showVigFree = document.getElementById(
      "modal-vig-free-toggle"
    ).checked;
    const { modalSortConfig } = this.state;
    let bestDecimalA = 0,
      bestDecimalB = 0;

    dataWithTrueOdds.forEach((book) => {
      const odds =
        showVigFree && book.trueOdds
          ? book.trueOdds
          : book.vigOdds || book.odds;
      if (!odds) return;
      const oddsA = odds.oddsA !== undefined ? odds.oddsA : odds.over;
      const oddsB = odds.oddsB !== undefined ? odds.oddsB : odds.under;
      if (oddsA !== null) {
        const decA = App.helpers.americanToDecimal(oddsA);
        if (decA > bestDecimalA) bestDecimalA = decA;
      }
      if (oddsB !== null) {
        const decB = App.helpers.americanToDecimal(oddsB);
        if (decB > bestDecimalB) bestDecimalB = decB;
      }
    });

    const getSortValue = (book, column) => {
      if (column === "bookmaker") return book.bookmaker;
      const oddsData =
        showVigFree && book.trueOdds
          ? book.trueOdds
          : book.vigOdds || book.odds;
      if (!oddsData) return null;
      let americanOdds;
      if (column === "sideA")
        americanOdds =
          oddsData.oddsA !== undefined ? oddsData.oddsA : oddsData.over;
      else
        americanOdds =
          oddsData.oddsB !== undefined ? oddsData.oddsB : oddsData.under;
      return americanOdds !== null
        ? App.helpers.americanToDecimal(americanOdds)
        : null;
    };

    const sortedBooks = [...dataWithTrueOdds].sort((a, b) => {
      let valA = getSortValue(a, modalSortConfig.column);
      let valB = getSortValue(b, modalSortConfig.column);
      if (valA == null)
        valA = modalSortConfig.direction === "asc" ? Infinity : -Infinity;
      if (valB == null)
        valB = modalSortConfig.direction === "asc" ? Infinity : -Infinity;
      if (valA < valB) return modalSortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return modalSortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    const getSortIndicator = (column) =>
      modalSortConfig.column === column
        ? modalSortConfig.direction === "asc"
          ? " ▲"
          : " ▼"
        : "";
    let headerA, headerB;

    if (isProp) {
      headerA = `Over ${lineData.point}`;
      headerB = `Under ${lineData.point}`;
    } else {
      if (marketType === "moneyline") {
        headerA = item.teamA;
        headerB = item.teamB;
      } else if (marketType === "spreads") {
        headerA = `${item.teamA} ${App.helpers.formatPoint(lineData.point)}`;
        headerB = `${item.teamB} ${App.helpers.formatPoint(-lineData.point)}`;
      } else {
        headerA = `Over ${lineData.point}`;
        headerB = `Under ${lineData.point}`;
      }
    }

    const rowsHTML = sortedBooks
      .map((book) =>
        this._createOddsTableRow(book, bestDecimalA, bestDecimalB, showVigFree)
      )
      .join("");
    return `<table class="w-full text-left table-auto border-collapse odds-table"><thead><tr><th class="p-2 w-1/3 text-sm font-semibold text-main-secondary sortable-header cursor-pointer" data-sort="bookmaker">Bookmaker${getSortIndicator(
      "bookmaker"
    )}</th><th class="p-2 w-1/3 text-sm font-semibold text-main-secondary text-center sortable-header cursor-pointer" data-sort="sideA">${headerA}${getSortIndicator(
      "sideA"
    )}</th><th class="p-2 w-1/3 text-sm font-semibold text-main-secondary text-center sortable-header cursor-pointer" data-sort="sideB">${headerB}${getSortIndicator(
      "sideB"
    )}</th></tr></thead><tbody>${rowsHTML}</tbody></table>`;
  },

  _createOddsTableRow(book, bestDecimalA, bestDecimalB, showVigFree) {
    const oddsToDisplay =
      showVigFree && book.trueOdds ? book.trueOdds : book.vigOdds || book.odds;
    if (!oddsToDisplay) return "<tr><td colspan='3'></td></tr>";
    const oddsA =
      oddsToDisplay.oddsA !== undefined
        ? oddsToDisplay.oddsA
        : oddsToDisplay.over;
    const oddsB =
      oddsToDisplay.oddsB !== undefined
        ? oddsToDisplay.oddsB
        : oddsToDisplay.under;
    const decA = oddsA !== null ? App.helpers.americanToDecimal(oddsA) : 0;
    const decB = oddsB !== null ? App.helpers.americanToDecimal(oddsB) : 0;
    const isBestA =
      decA !== 0 && Math.abs(decA - bestDecimalA) < 0.0001
        ? "best-odds-highlight"
        : "";
    const isBestB =
      decB !== 0 && Math.abs(decB - bestDecimalB) < 0.0001
        ? "best-odds-highlight"
        : "";

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

    // CORRECTED: This now ALWAYS uses formatOdds to ensure whole numbers for the table rows
    const oddsAHTML =
      oddsA != null
        ? App.helpers.formatOdds(oddsA)
        : '<span class="text-main-secondary">-</span>';
    const oddsBHTML =
      oddsB != null
        ? App.helpers.formatOdds(oddsB)
        : '<span class="text-main-secondary">-</span>';

    return `<tr class="border-b border-border-primary"><td class="p-3 text-main-primary font-medium"><div class="flex items-center space-x-3"><img src="${logoSrc}" alt="${book.bookmaker}" class="h-8 w-8 object-contain" onerror="this.style.display='none'"><div><span>${book.bookmaker}${sharpIndicator}</span><span class="block text-xs text-main-secondary">${vigText}</span></div></div></td><td class="p-3 text-center ${isBestA}"><span class="font-bold text-lg text-main-primary">${oddsAHTML}</span></td><td class="p-3 text-center ${isBestB}"><span class="font-bold text-lg text-main-primary">${oddsBHTML}</span></td></tr>`;
  },
};
