const MIN_PLAYERS = 1;
const MAX_PLAYERS = 15;

function createPlayer(index) {
  return {
    id: `p${index}`,
    name: `Игрок ${index}`,
    score: 0,
  };
}

export function createInitialPlayers(count = MIN_PLAYERS) {
  const safeCount = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, count));
  return Array.from({ length: safeCount }, (_, index) => createPlayer(index + 1));
}

export function normalizePlayers(rawPlayers) {
  if (!Array.isArray(rawPlayers) || rawPlayers.length === 0) {
    return createInitialPlayers(1);
  }

  const safePlayers = rawPlayers.slice(0, MAX_PLAYERS).map((player, index) => ({
    id: typeof player?.id === "string" && player.id ? player.id : `p${index + 1}`,
    name: typeof player?.name === "string" && player.name.trim() ? player.name.trim() : `Игрок ${index + 1}`,
    score: Number.isFinite(player?.score) ? Number(player.score) : 0,
  }));

  while (safePlayers.length < MIN_PLAYERS) {
    safePlayers.push(createPlayer(safePlayers.length + 1));
  }

  return safePlayers;
}

function getNextPlayerNumber(players) {
  const maxNumber = players.reduce((acc, player) => {
    const match = typeof player.id === "string" ? player.id.match(/^p(\d+)$/) : null;
    if (!match) {
      return acc;
    }
    return Math.max(acc, Number(match[1]));
  }, 0);

  return maxNumber + 1;
}

export function addPlayer(players) {
  if (players.length >= MAX_PLAYERS) {
    return players;
  }

  const nextNumber = getNextPlayerNumber(players);
  return [...players, createPlayer(nextNumber)];
}

export function removePlayer(players) {
  if (players.length <= MIN_PLAYERS) {
    return players;
  }

  return players.slice(0, -1);
}

export function renamePlayer(players, playerId, name) {
  const normalizedName = name.trim() || "Без имени";
  return players.map((player) =>
    player.id === playerId
      ? {
          ...player,
          name: normalizedName,
        }
      : player
  );
}

export function applyQuestionResult(players, playerId, value, isCorrect) {
  const delta = isCorrect ? value : 0;
  return players.map((player) =>
    player.id === playerId
      ? {
          ...player,
          score: player.score + delta,
        }
      : player
  );
}

export { MIN_PLAYERS, MAX_PLAYERS };
