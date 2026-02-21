import { loadGameData } from "./data.js";
import { renderGameBoard, renderPlayersPanel, showStatus } from "./ui.js";
import {
  addPlayer,
  applyQuestionResult,
  createInitialPlayers,
  MAX_PLAYERS,
  MIN_PLAYERS,
  normalizePlayers,
  removePlayer,
  renamePlayer,
} from "./score.js";
import { buildInitialState, clearGameState, loadGameState, saveGameState } from "./storage.js";

const DATA_URL = "data/game.json";

let gameData = null;
let state = null;
let questionModal = null;
let activeQuestion = null;
let tooltips = [];

const modalRefs = {
  root: null,
  title: null,
  questionText: null,
  answerWrap: null,
  answerText: null,
  playerSelect: null,
  showAnswerButton: null,
  correctButton: null,
  wrongButton: null,
};

function initToolbarTooltips() {
  if (!window.bootstrap?.Tooltip) {
    return;
  }

  for (const tooltip of tooltips) {
    tooltip.dispose();
  }
  tooltips = [];

  const tooltipTargets = document.querySelectorAll("[data-tooltip]");
  for (const element of tooltipTargets) {
    const tooltipText = element.getAttribute("data-tooltip");
    if (!tooltipText) {
      continue;
    }
    element.setAttribute("data-bs-title", tooltipText);
    const tooltip = new window.bootstrap.Tooltip(element, {
      placement: "bottom",
      trigger: "hover focus",
      container: "body",
    });
    tooltips.push(tooltip);
  }
}

function updatePlayersCounter() {
  const counter = document.getElementById("players-count");
  if (!counter) {
    return;
  }
  counter.textContent = `${state.players.length}/${MAX_PLAYERS}`;
}

function updatePlayersButtonsState() {
  const addButton = document.getElementById("add-player-btn");
  const removeButton = document.getElementById("remove-player-btn");

  if (addButton) {
    addButton.disabled = state.players.length >= MAX_PLAYERS;
  }
  if (removeButton) {
    removeButton.disabled = state.players.length <= MIN_PLAYERS;
  }
}

function findQuestionById(questionId) {
  if (!gameData) {
    return null;
  }

  for (const category of gameData.categories) {
    const question = category.questions.find((item) => item.id === questionId);
    if (question) {
      return {
        ...question,
        categoryName: category.name,
      };
    }
  }

  return null;
}

function getPlayerById(playerId) {
  if (!playerId) {
    return null;
  }
  return state.players.find((player) => player.id === playerId) || null;
}

function getNormalizedCurrentPlayerId(players, currentPlayerId) {
  if (!Array.isArray(players) || players.length === 0) {
    return null;
  }

  if (currentPlayerId && players.some((player) => player.id === currentPlayerId)) {
    return currentPlayerId;
  }

  return players[0].id;
}

function getNextPlayerId(players, fromPlayerId) {
  if (!Array.isArray(players) || players.length === 0) {
    return null;
  }

  const currentIndex = players.findIndex((player) => player.id === fromPlayerId);
  if (currentIndex === -1) {
    return players[0].id;
  }

  return players[(currentIndex + 1) % players.length].id;
}

function normalizeCurrentPlayerInState() {
  state = {
    ...state,
    currentPlayerId: getNormalizedCurrentPlayerId(state.players, state.currentPlayerId),
  };
}

function showCurrentPlayerStatus(note = "") {
  const statusElement = document.getElementById("app-status");
  if (!statusElement) {
    return;
  }

  const currentPlayer = getPlayerById(state.currentPlayerId);

  statusElement.className = "status-line status-info";
  statusElement.textContent = "";

  if (note) {
    statusElement.append(`${note} `);
  }

  statusElement.append("Текущий игрок: ");
  const nameNode = document.createElement("strong");
  nameNode.textContent = currentPlayer ? currentPlayer.name : "не выбран";
  statusElement.append(nameNode);
  statusElement.append(".");
}

function populateAnsweringPlayers(selectedPlayerId = null) {
  if (!modalRefs.playerSelect) {
    return;
  }

  modalRefs.playerSelect.innerHTML = "";
  for (const player of state.players) {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = `${player.name} (${player.score})`;
    modalRefs.playerSelect.append(option);
  }

  if (state.players.length === 0) {
    return;
  }

  const fallbackId = state.players[0].id;
  const finalId = state.players.some((player) => player.id === selectedPlayerId)
    ? selectedPlayerId
    : fallbackId;
  modalRefs.playerSelect.value = finalId;
}

function setQuestionButtonsState({ showAnswerEnabled, resultEnabled }) {
  if (modalRefs.showAnswerButton) {
    modalRefs.showAnswerButton.disabled = !showAnswerEnabled;
  }
  if (modalRefs.correctButton) {
    modalRefs.correctButton.disabled = !resultEnabled;
  }
  if (modalRefs.wrongButton) {
    modalRefs.wrongButton.disabled = !resultEnabled;
  }
}

function isAnswerVisible() {
  return Boolean(modalRefs.answerWrap && !modalRefs.answerWrap.classList.contains("d-none"));
}

function updateResultButtonsState() {
  const canAnswer =
    Boolean(activeQuestion) &&
    isAnswerVisible() &&
    Boolean(modalRefs.playerSelect?.value);

  setQuestionButtonsState({
    showAnswerEnabled: Boolean(activeQuestion) && !isAnswerVisible(),
    resultEnabled: canAnswer,
  });
}

function resetQuestionModalView() {
  activeQuestion = null;

  if (modalRefs.title) {
    modalRefs.title.textContent = "Вопрос";
  }
  if (modalRefs.questionText) {
    modalRefs.questionText.textContent = "Текст вопроса";
  }
  if (modalRefs.answerText) {
    modalRefs.answerText.textContent = "Текст ответа";
  }
  if (modalRefs.answerWrap) {
    modalRefs.answerWrap.classList.add("d-none");
  }
  if (modalRefs.playerSelect) {
    modalRefs.playerSelect.innerHTML = "";
  }

  setQuestionButtonsState({
    showAnswerEnabled: false,
    resultEnabled: false,
  });
}

function renderState() {
  renderPlayersPanel(state.players);
  updatePlayersCounter();
  updatePlayersButtonsState();

  if (gameData) {
    renderGameBoard(gameData, state.used);
  }

  if (activeQuestion) {
    populateAnsweringPlayers(modalRefs.playerSelect?.value);
    updateResultButtonsState();
  }
}

function persistAndRender(statusNote = "") {
  normalizeCurrentPlayerInState();
  saveGameState(state);
  renderState();
  showCurrentPlayerStatus(statusNote);
}

function markQuestionUsed(questionId) {
  if (state.used.includes(questionId)) {
    return;
  }

  state = {
    ...state,
    used: [...state.used, questionId],
  };
}

function openQuestionModal(question) {
  activeQuestion = question;

  if (modalRefs.title) {
    modalRefs.title.textContent = `${question.categoryName} • ${question.value}`;
  }
  if (modalRefs.questionText) {
    modalRefs.questionText.textContent = question.question;
  }
  if (modalRefs.answerText) {
    modalRefs.answerText.textContent = question.answer;
  }
  if (modalRefs.answerWrap) {
    modalRefs.answerWrap.classList.add("d-none");
  }

  populateAnsweringPlayers(state.currentPlayerId);
  updateResultButtonsState();
  questionModal?.show();
}

function applyResult(isCorrect) {
  if (!activeQuestion || !modalRefs.playerSelect) {
    return;
  }

  const playerId = modalRefs.playerSelect.value;
  const player = getPlayerById(playerId);
  if (!player) {
    showCurrentPlayerStatus("Выберите игрока для фиксации результата.");
    return;
  }

  state = {
    ...state,
    players: applyQuestionResult(state.players, playerId, activeQuestion.value, isCorrect),
    currentPlayerId: getNextPlayerId(state.players, playerId),
  };

  markQuestionUsed(activeQuestion.id);

  const statusMessage = isCorrect
    ? `${player.name} получает ${activeQuestion.value} очков.`
    : `${player.name} ответил неверно: счет без изменений.`;
  persistAndRender(statusMessage);
  questionModal?.hide();
}

function bindModalControls() {
  modalRefs.root = document.getElementById("question-modal");
  modalRefs.title = document.getElementById("question-modal-title");
  modalRefs.questionText = document.getElementById("question-text");
  modalRefs.answerWrap = document.getElementById("answer-wrap");
  modalRefs.answerText = document.getElementById("answer-text");
  modalRefs.playerSelect = document.getElementById("answer-player-select");
  modalRefs.showAnswerButton = document.getElementById("show-answer-btn");
  modalRefs.correctButton = document.getElementById("answer-correct-btn");
  modalRefs.wrongButton = document.getElementById("answer-wrong-btn");

  if (modalRefs.root && window.bootstrap?.Modal) {
    questionModal = window.bootstrap.Modal.getOrCreateInstance(modalRefs.root);
  }

  modalRefs.showAnswerButton?.addEventListener("click", () => {
    if (!activeQuestion || !modalRefs.answerWrap) {
      return;
    }
    modalRefs.answerWrap.classList.remove("d-none");
    updateResultButtonsState();
  });

  modalRefs.playerSelect?.addEventListener("change", () => {
    updateResultButtonsState();
  });

  modalRefs.correctButton?.addEventListener("click", () => {
    applyResult(true);
  });

  modalRefs.wrongButton?.addEventListener("click", () => {
    applyResult(false);
  });

  modalRefs.root?.addEventListener("hidden.bs.modal", () => {
    resetQuestionModalView();
  });

  resetQuestionModalView();
}

function bindBoardControls() {
  const boardElement = document.getElementById("game-board");
  boardElement?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest("button[data-question-id]");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    if (!gameData) {
      showCurrentPlayerStatus("Данные игры пока не загружены.");
      return;
    }

    const questionId = button.dataset.questionId;
    if (!questionId || state.used.includes(questionId)) {
      return;
    }

    const question = findQuestionById(questionId);
    if (!question) {
      markQuestionUsed(questionId);
      persistAndRender("Вопрос для этой ячейки не найден. Клетка помечена как сыгранная.");
      return;
    }

    openQuestionModal(question);
  });
}

function bindPlayerControls() {
  const addButton = document.getElementById("add-player-btn");
  const removeButton = document.getElementById("remove-player-btn");
  const resetButton = document.getElementById("reset-game-btn");
  const playersPanel = document.getElementById("players-panel");

  addButton?.addEventListener("click", () => {
    state = {
      ...state,
      players: addPlayer(state.players),
    };
    persistAndRender();
  });

  removeButton?.addEventListener("click", () => {
    state = {
      ...state,
      players: removePlayer(state.players),
    };
    persistAndRender();
  });

  resetButton?.addEventListener("click", () => {
    const isConfirmed = window.confirm("Сбросить игру и очистить текущее состояние?");
    if (!isConfirmed) {
      return;
    }

    clearGameState();
    state = buildInitialState(createInitialPlayers(1));
    persistAndRender("Игра сброшена.");
    questionModal?.hide();
  });

  playersPanel?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-player-name]")) {
      return;
    }

    const playerId = target.dataset.playerId;
    if (!playerId) {
      return;
    }

    state = {
      ...state,
      players: renamePlayer(state.players, playerId, target.value),
    };
    persistAndRender();
  });
}

async function init() {
  const persistedState = loadGameState();
  state = persistedState
    ? {
        ...persistedState,
        players: normalizePlayers(persistedState.players),
        used: Array.isArray(persistedState.used) ? persistedState.used : [],
        currentPlayerId: persistedState.currentPlayerId ?? null,
      }
    : buildInitialState(createInitialPlayers(1));

  normalizeCurrentPlayerInState();
  saveGameState(state);

  bindPlayerControls();
  bindModalControls();
  bindBoardControls();
  initToolbarTooltips();
  renderState();
  showStatus("Загрузка данных игры...", "info");

  try {
    gameData = await loadGameData(DATA_URL);
    renderState();
    showCurrentPlayerStatus(`Данные загружены: ${gameData.categories.length} категорий.`);
  } catch (error) {
    console.error(error);
    showStatus(`Ошибка загрузки: ${error.message}`, "danger");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void init();
});
