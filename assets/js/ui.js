function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function showStatus(message, type = "info") {
  const statusElement = document.getElementById("app-status");
  if (!statusElement) {
    return;
  }

  statusElement.className = `status-line status-${type}`;
  statusElement.textContent = message;
}

export function renderPlayersPanel(players) {
  const panel = document.getElementById("players-panel");
  if (!panel) {
    return;
  }

  panel.innerHTML = players
    .map(
      (player, index) => `
        <div class="score-row">
          <span class="score-index">${index + 1}.</span>
          <input
            id="player-name-${escapeHtml(player.id)}"
            type="text"
            class="form-control form-control-sm score-input"
            value="${escapeHtml(player.name)}"
            data-player-name
            data-player-id="${escapeHtml(player.id)}"
            maxlength="32"
          >
          <span class="badge text-bg-primary score-badge">${escapeHtml(player.score)}</span>
        </div>
      `
    )
    .join("");

  const summaryMeta = document.getElementById("score-summary-meta");
  if (summaryMeta) {
    const leader = players.reduce(
      (acc, player) => (player.score > acc.score ? player : acc),
      { name: "—", score: Number.NEGATIVE_INFINITY }
    );
    const leaderText = players.length > 0 ? `${leader.name} (${leader.score})` : "—";
    summaryMeta.textContent = `Игроков: ${players.length} | Лидер: ${leaderText}`;
  }
}

function renderQuestionCell(category, value, usedQuestionIds) {
  const question = category.questions.find((item) => item.value === value);
  if (!question) {
    return `
      <td class="p-1 p-lg-2">
        <button class="btn btn-outline-secondary board-btn w-100" type="button" disabled aria-disabled="true">
          -
        </button>
      </td>
    `;
  }

  const isUsed = usedQuestionIds.has(question.id);
  return `
    <td class="p-1 p-lg-2">
      <button
        class="btn board-btn ${isUsed ? "board-btn-used" : "board-btn-active"} w-100"
        type="button"
        data-question-id="${escapeHtml(question.id)}"
        ${isUsed ? "disabled aria-disabled=\"true\"" : ""}
      >
        ${value}
      </button>
    </td>
  `;
}

export function renderGameBoard(gameData, used = []) {
  const boardElement = document.getElementById("game-board");
  if (!boardElement) {
    return;
  }

  const usedQuestionIds = new Set(used);
  const bodyRows = gameData.categories
    .map((category) => {
      const questionCells = gameData.values
        .map((value) => renderQuestionCell(category, value, usedQuestionIds))
        .join("");

      return `
        <tr>
          <th class="category-cell">${escapeHtml(category.name)}</th>
          ${questionCells}
        </tr>
      `;
    })
    .join("");

  boardElement.innerHTML = `
    <table class="table table-bordered align-middle board-table mb-0">
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}
