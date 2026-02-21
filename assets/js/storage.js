export const STORAGE_KEY = "svoyaGame.state";
const STORAGE_VERSION = 1;

export function buildInitialState(players) {
  return {
    version: STORAGE_VERSION,
    players,
    used: [],
    currentPlayerId: players[0]?.id ?? null,
  };
}

export function loadGameState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== STORAGE_VERSION) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveGameState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearGameState() {
  localStorage.removeItem(STORAGE_KEY);
}
