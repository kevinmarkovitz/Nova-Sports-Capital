// src/helpers/api.js
const API_BASE_URL = "http://localhost:3001/api";

export async function fetchGames() {
  const response = await fetch(`${API_BASE_URL}/games`);
  if (!response.ok) {
    throw new Error(
      "Failed to fetch game data. Is your backend server running?"
    );
  }
  return response.json();
}

export async function fetchProps() {
  const response = await fetch(`${API_BASE_URL}/props`);
  if (!response.ok) {
    // It's okay if props don't exist, return empty array
    return { props: [] };
  }
  return response.json();
}
