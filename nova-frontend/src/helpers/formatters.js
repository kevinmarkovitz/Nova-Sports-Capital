// src/helpers/formatters.js

export function formatPoint(point) {
  if (point > 0) return `+${point}`;
  return point;
}

export function formatOdds(odds) {
  if (odds === null || typeof odds === "undefined") return "-";
  if (odds > 0) return `+${Math.round(odds)}`;
  return Math.round(odds);
}

// NEW FUNCTION to handle rounding to 2 decimal places
export function formatDecimalOdds(odds) {
  if (odds === null || typeof odds === "undefined") return "-";
  const rounded = odds.toFixed(2);
  if (parseFloat(rounded) > 0) {
    return `+${rounded}`;
  }
  return rounded;
}

export function americanToProb(odds) {
  if (odds === null || typeof odds === "undefined") return 0;
  if (odds >= 100) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

export function americanToDecimal(odds) {
  if (odds >= 100) return odds / 100 + 1;
  return 100 / Math.abs(odds) + 1;
}
