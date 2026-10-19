
"use strict";

const $ = selector => document.querySelector(selector);

const resultEl = $("#result");
const expressionEl = $("#expression");
const statusEl = $("#status");

let current = "0";
let previous = null;
let operator = null;
let waitingForNumber = false;
let expression = "";
let justCalculated = false;
let errorState = false;

const HISTORY_KEY = "calcifyHistory";
const THEME_KEY = "calcifyTheme";
let history = loadHistory();

function loadHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(data) ? data.slice(0, 10) : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    statusEl.textContent = "History not saved";
  }
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "Error";

  const rounded = Number(value.toPrecision(12));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function displayNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "Error";

  return number.toLocaleString("en-US", {
    maximumFractionDigits: 10,
    useGrouping: true
  });
}

function updateDisplay() {
  resultEl.textContent = displayNumber(current);
  expressionEl.textContent = expression;
}

function reset() {
  current = "0";
  previous = null;
  operator = null;
  waitingForNumber = false;
  expression = "";
  justCalculated = false;
  errorState = false;
  statusEl.textContent = "Ready";
  updateDisplay();
}

function inputDigit(digit) {
  if (errorState) reset();

  if (waitingForNumber || justCalculated) {
    current = digit;
    waitingForNumber = false;
    justCalculated = false;
  } else if (current === "0") {
    current = digit;
  } else if (current.replace("-", "").length < 15) {
    current += digit;
  }

  statusEl.textContent = "Ready";
  updateDisplay();
}

function inputDecimal() {
  if (errorState) reset();

  if (waitingForNumber || justCalculated) {
    current = "0.";
    waitingForNumber = false;
    justCalculated = false;
  } else if (!current.includes(".")) {
    current += ".";
  }

  updateDisplay();
}

function calculate(a, b, op) {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? null : a / b;
    default: return b;
  }
}

function setError(message) {
  current = "0";
  previous = null;
  operator = null;
  waitingForNumber = false;
  justCalculated = false;
  errorState = true;
  expression = message;
  statusEl.textContent = "Check input";
  updateDisplay();
}

function chooseOperator(nextOperator) {
  if (errorState) return;

  const inputValue = Number(current);

  if (operator && !waitingForNumber) {
    const result = calculate(previous, inputValue, operator);

    if (result === null || !Number.isFinite(result)) {
      setError("Cannot divide by zero");
      return;
    }

    current = formatNumber(result);
    previous = result;
    updateDisplay();
  } else {
    previous = inputValue;
  }

  operator = nextOperator;
  waitingForNumber = true;
  justCalculated = false;
  expression = `${displayNumber(previous)} ${operatorSymbol(nextOperator)}`;
  statusEl.textContent = "Calculating";
  updateDisplay();
}

function operatorSymbol(op) {
  return { "+": "+", "-": "−", "*": "×", "/": "÷" }[op] || op;
}

function equals() {
  if (errorState || operator === null || waitingForNumber) return;

  const a = previous;
  const b = Number(current);
  const op = operator;
  const finalResult = calculate(a, b, op);

  if (finalResult === null) {
    setError("Cannot divide by zero");
    return;
  }

  if (!Number.isFinite(finalResult)) {
    setError("Number too large");
    return;
  }

  expression = `${displayNumber(a)} ${operatorSymbol(op)} ${displayNumber(b)} =`;
  current = formatNumber(finalResult);

  history.unshift({
    expression,
    result: current
  });
  history = history.slice(0, 10);
  saveHistory();
  renderHistory();

  previous = null;
  operator = null;
  waitingForNumber = false;
  justCalculated = true;
  statusEl.textContent = "Complete";
  updateDisplay();
}

function deleteDigit() {
  if (errorState || justCalculated || waitingForNumber) {
    reset();
    return;
  }

  current = current.length > 1 ? current.slice(0, -1) : "0";

  if (current === "-" || current === "") current = "0";

  updateDisplay();
}

function percentage() {
  if (errorState) return;

  current = formatNumber(Number(current) / 100);
  waitingForNumber = false;
  justCalculated = false;
  updateDisplay();
}

function toggleSign() {
  if (errorState || current === "0") return;

  current = current.startsWith("-") ? current.slice(1) : "-" + current;
  updateDisplay();
}

function renderHistory() {
  const list = $("#historyList");

  list.innerHTML = history.map((item, index) => `
    <li>
      <span></span>
      <span></span>
    </li>
  `).join("");

  [...list.children].forEach((li, index) => {
    li.children[0].textContent = history[index].expression;
    li.children[1].textContent = displayNumber(history[index].result);
  });
}

$("#keypad").addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.value !== undefined) {
    const value = button.dataset.value;

    if (/^\d$/.test(value)) inputDigit(value);
    else if (value === ".") inputDecimal();
    else chooseOperator(value);

    return;
  }

  switch (button.dataset.action) {
    case "clear": reset(); break;
    case "delete": deleteDigit(); break;
    case "percent": percentage(); break;
    case "sign": toggleSign(); break;
    case "equals": equals(); break;
  }
});

document.addEventListener("keydown", event => {
  if (/^\d$/.test(event.key)) {
    inputDigit(event.key);
  } else if (event.key === ".") {
    inputDecimal();
  } else if (["+", "-", "*", "/"].includes(event.key)) {
    chooseOperator(event.key);
  } else if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    equals();
  } else if (event.key === "Backspace") {
    deleteDigit();
  } else if (event.key === "Escape") {
    reset();
  } else if (event.key === "%") {
    percentage();
  }
});

$("#themeBtn").addEventListener("click", () => {
  const dark = !document.body.classList.contains("dark");

  document.body.classList.toggle("dark", dark);
  $("#themeBtn").textContent = dark ? "☀" : "☾";

  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {}
});

try {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    $("#themeBtn").textContent = "☀";
  }
} catch {}

$("#historyToggle").addEventListener("click", () => {
  const panel = $("#historyPanel");
  panel.hidden = !panel.hidden;

  $("#historyToggle").textContent =
    panel.hidden ? "History ↗" : "Hide history";

  renderHistory();
});

$("#clearHistory").addEventListener("click", () => {
  history = [];
  saveHistory();
  renderHistory();
  statusEl.textContent = "History cleared";
});

renderHistory();
updateDisplay();
