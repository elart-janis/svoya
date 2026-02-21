const REQUIRED_VALUES = [200, 400, 600, 800];
const REQUIRED_CATEGORIES_COUNT = 5;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateValues(values) {
  assert(Array.isArray(values), "Поле values должно быть массивом.");
  assert(values.length === REQUIRED_VALUES.length, "Поле values должно содержать 4 значения.");

  for (let index = 0; index < REQUIRED_VALUES.length; index += 1) {
    const expectedValue = REQUIRED_VALUES[index];
    assert(values[index] === expectedValue, `Ожидалось значение ${expectedValue} в values[${index}].`);
  }
}

function validateQuestion(question, categoryId, categoryValues, questionIds) {
  assert(question && typeof question === "object", `В категории ${categoryId} найден некорректный вопрос.`);
  assert(isNonEmptyString(question.id), `У вопроса в категории ${categoryId} отсутствует id.`);
  assert(!questionIds.has(question.id), `Повторяющийся id вопроса: ${question.id}.`);
  questionIds.add(question.id);

  assert(
    Number.isInteger(question.value) && categoryValues.includes(question.value),
    `У вопроса ${question.id} некорректное value: ${question.value}.`
  );
  assert(isNonEmptyString(question.question), `У вопроса ${question.id} отсутствует текст question.`);
  assert(isNonEmptyString(question.answer), `У вопроса ${question.id} отсутствует текст answer.`);
}

function validateCategory(category, categoryIds, questionIds, values) {
  assert(category && typeof category === "object", "Найдена некорректная категория.");
  assert(isNonEmptyString(category.id), "Категория должна иметь непустой id.");
  assert(!categoryIds.has(category.id), `Повторяющийся id категории: ${category.id}.`);
  categoryIds.add(category.id);

  assert(isNonEmptyString(category.name), `У категории ${category.id} отсутствует name.`);
  assert(Array.isArray(category.questions), `У категории ${category.id} отсутствует массив questions.`);
  assert(
    category.questions.length === values.length,
    `В категории ${category.id} должно быть ровно ${values.length} вопроса(ов).`
  );

  const valueInCategory = new Set();
  for (const question of category.questions) {
    validateQuestion(question, category.id, values, questionIds);
    assert(
      !valueInCategory.has(question.value),
      `В категории ${category.id} несколько вопросов со стоимостью ${question.value}.`
    );
    valueInCategory.add(question.value);
  }

  for (const value of values) {
    assert(valueInCategory.has(value), `В категории ${category.id} отсутствует вопрос со стоимостью ${value}.`);
  }
}

export function validateGameData(data) {
  assert(data && typeof data === "object", "Файл game.json должен быть объектом.");
  assert(isNonEmptyString(data.title), "Поле title должно быть непустой строкой.");

  validateValues(data.values);
  assert(Array.isArray(data.categories), "Поле categories должно быть массивом.");
  assert(data.categories.length === REQUIRED_CATEGORIES_COUNT, "Должно быть ровно 5 категорий.");

  const categoryIds = new Set();
  const questionIds = new Set();
  for (const category of data.categories) {
    validateCategory(category, categoryIds, questionIds, data.values);
  }

  return data;
}

export async function loadGameData(url = "data/game.json") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить ${url} (${response.status}).`);
  }

  let parsed;
  try {
    parsed = await response.json();
  } catch (error) {
    throw new Error(`Файл ${url} содержит невалидный JSON.`);
  }

  return validateGameData(parsed);
}
