// src/helpers/bookmakerLogos.js

// This path tells the browser to start looking from inside your 'public' folder.
const basePath = "/images/logos/";

const logos = {
  // Make sure your image files in the logos folder have these exact names (lowercase)
  pinnacle: `${basePath}pinnacle.png`,
  novig: `${basePath}novig.png`,
  prophetx: `${basePath}prophetx.png`,
  matchbook: `${basePath}matchbook.png`,
  smarkets: `${basePath}smarkets.png`,
  betfair_ex_eu: `${basePath}betfair_ex_eu.png`, // Or use a generic 'betfair.png'
  betfair_ex_au: `${basePath}betfair_ex_au.png`, // Or use a generic 'betfair.png'
  betfair_ex_uk: `${basePath}betfair_ex_uk.png`, // Or use a generic 'betfair.png'
  betrivers: `${basePath}betrivers.png`,
  ballybet: `${basePath}ballybet.png`,
  mybookieag: `${basePath}mybookieag.png`,
  fliff: `${basePath}fliff.png`,
  unibet_uk: `${basePath}unibet_uk.png`, // Or use a generic 'unibet.png'
  betmgm: `${basePath}betmgm.png`,
  hardrockbet: `${basePath}hardrockbet.png`,
  fanatics: `${basePath}fanatics.png`,
  espnbet: `${basePath}espnbet.png`,
  bet365_au: `${basePath}bet365_au.png`, // Or use a generic 'bet365.png'
  williamhill_us: `${basePath}williamhill_us.png`, // Or use a generic 'williamhill.png'
  rebet: `${basePath}rebet.png`,
  onexbet: `${basePath}onexbet.png`,
  betway: `${basePath}betway.png`,
  draftkings: `${basePath}draftkings.png`,
  fanduel: `${basePath}fanduel.png`,
  lowvig: `${basePath}lowvig.png`,
  betonlineag: `${basePath}betonlineag.png`,
};

// This is a fallback image in case a logo isn't found.
const defaultLogo = `${basePath}default.png`;

export const getBookmakerLogo = (bookmakerKey) => {
  // The .toLowerCase() helps match keys from the API
  return logos[bookmakerKey.toLowerCase()] || defaultLogo;
};
