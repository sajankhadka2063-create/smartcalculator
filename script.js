
/* =========================================================
   SMARTCALCULATOR
   File: script.js
   Version: 2.3.0
   Developer: Sajan Khadka
   ========================================================= */

"use strict";

/* =========================================================
   1. DOM ELEMENTS
   ========================================================= */

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const elements = {
    clock: $("#clock"),

    menuBtn: $("#menuBtn"),
    dropdownMenu: $("#dropdownMenu"),
    menuThemeBtn: $("#menuThemeBtn"),
    fullscreenBtn: $("#fullscreenBtn"),

    calculatorView: $("#calculatorView"),
    scientificView: $("#scientificView"),
    historyView: $("#historyView"),
    converterView: $("#converterView"),
    settingsView: $("#settingsView"),

    expression: $("#expression"),
    result: $("#result"),

    scientificExpression: $("#scientificExpression"),
    scientificResult: $("#scientificResult"),
    scientificBackBtn: $("#scientificBackBtn"),
    scientificKeypad: $("#scientificKeypad"),
    degreeBtn: $("#degreeBtn"),
    radianBtn: $("#radianBtn"),

    historyList: $("#historyList"),
    clearHistoryBtn: $("#clearHistoryBtn"),

    categoryGrid: $("#categoryGrid"),
    standardConverter: $("#standardConverter"),
    discountConverter: $("#discountConverter"),
    bmiConverter: $("#bmiConverter"),

    converterTitle: $("#converterTitle"),
    rateStatus: $("#rateStatus"),
    fromValue: $("#fromValue"),
    toValue: $("#toValue"),
    fromUnit: $("#fromUnit"),
    toUnit: $("#toUnit"),
    swapUnits: $("#swapUnits"),
    conversionResult: $("#conversionResult"),
    convertBtn: $("#convertBtn"),
    refreshRatesBtn: $("#refreshRatesBtn"),

    originalPrice: $("#originalPrice"),
    discountPercent: $("#discountPercent"),
    discountAmount: $("#discountAmount"),
    finalPrice: $("#finalPrice"),
    totalSavings: $("#totalSavings"),

    bmiWeight: $("#bmiWeight"),
    bmiHeight: $("#bmiHeight"),
    heightUnit: $("#heightUnit"),
    calculateBMI: $("#calculateBMI"),
    bmiValue: $("#bmiValue"),
    bmiCategory: $("#bmiCategory"),

    darkModeSetting: $("#darkModeSetting"),
    separatorSetting: $("#separatorSetting"),
    precisionSetting: $("#precisionSetting"),
    soundSetting: $("#soundSetting"),
    keyboardSetting: $("#keyboardSetting"),
    historySetting: $("#historySetting"),
    confirmSetting: $("#confirmSetting"),
    defaultPageSetting: $("#defaultPageSetting"),
    resetSettingsBtn: $("#resetSettingsBtn")
};


/* =========================================================
   2. APPLICATION STATE
   ========================================================= */

const STORAGE_KEYS = {
    history: "smartcalculator_history",
    settings: "smartcalculator_settings",
    theme: "smartcalculator_theme",
    lastAnswer: "smartcalculator_last_answer",
    angle: "smartcalculator_angle"
};

const DEFAULT_SETTINGS = {
    darkMode: false,
    separator: true,
    precision: 2,
    sound: false,
    keyboard: true,
    history: true,
    confirmClear: true,
    defaultPage: "calculatorView"
};

let settings = loadStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS);

settings = {
    ...DEFAULT_SETTINGS,
    ...(settings && typeof settings === "object" ? settings : {})
};

let calculationHistory = loadStorage(STORAGE_KEYS.history, []);
if (!Array.isArray(calculationHistory)) calculationHistory = [];

let lastAnswer = Number(loadStorage(STORAGE_KEYS.lastAnswer, 0)) || 0;

let currentView = "calculatorView";
let standardExpression = "";
let scientificExpression = "";
let scientificAnswer = lastAnswer;
let angleMode = loadStorage(STORAGE_KEYS.angle, "DEG");

let secondFunction = false;
let currencyRates = {};
let currencyLastUpdated = null;


/* =========================================================
   3. STORAGE HELPERS
   ========================================================= */

function loadStorage(key, fallback) {
    try {
        const stored = localStorage.getItem(key);
        return stored === null ? fallback : JSON.parse(stored);
    } catch (error) {
        console.warn("Storage read error:", key, error);
        return fallback;
    }
}

function saveStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn("Storage save error:", key, error);
    }
}


/* =========================================================
   4. NUMBER FORMATTING
   ========================================================= */

function getPrecision() {
    const precision = Number(settings.precision);
    return Number.isInteger(precision) && precision >= 0
        ? precision
        : 2;
}

function formatNumber(value, useSeparator = settings.separator) {
    if (!Number.isFinite(value)) {
        return "Error";
    }

    if (Math.abs(value) < 1e-12) value = 0;

    const precision = getPrecision();

    let output = Number(value.toFixed(precision)).toString();

    if (!useSeparator) return output;

    const parts = output.split(".");
    parts[0] = Number(parts[0]).toLocaleString("en-US");

    return parts.join(".");
}

function cleanNumber(value) {
    if (!Number.isFinite(value)) {
        throw new Error("Invalid calculation");
    }

    return Number.parseFloat(value.toPrecision(14));
}


/* =========================================================
   5. BUTTON SOUND
   ========================================================= */

let audioContext = null;

function playButtonSound() {
    if (!settings.sound) return;

    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        if (!audioContext) {
            audioContext = new AudioContextClass();
        }

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = 650;

        gain.gain.setValueAtTime(0.06, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + 0.06
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.06);

    } catch (error) {
        console.warn("Sound unavailable:", error);
    }
}


/* =========================================================
   6. CLOCK
   ========================================================= */

function updateClock() {
    if (!elements.clock) return;

    const now = new Date();

    elements.clock.textContent = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

updateClock();
setInterval(updateClock, 1000);


/* =========================================================
   7. VIEW NAVIGATION
   ========================================================= */

const viewIds = [
    "calculatorView",
    "scientificView",
    "historyView",
    "converterView",
    "settingsView"
];

function openView(viewId) {
    if (!viewIds.includes(viewId)) return;

    viewIds.forEach(id => {
        const view = document.getElementById(id);
        if (view) {
            view.classList.toggle("hidden", id !== viewId);
        }
    });

    currentView = viewId;

    $$(".toolbar-tab").forEach(tab => {
        tab.classList.toggle(
            "active",
            tab.dataset.view === viewId
        );
    });

    closeMenu();

    if (viewId === "historyView") renderHistory();

    if (viewId === "converterView") {
        updateConversion();
    }

    if (viewId === "scientificView") {
        updateScientificDisplay();
    }
}

$$("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
        playButtonSound();
        openView(button.dataset.view);
    });
});

$$("[data-open]").forEach(button => {
    button.addEventListener("click", () => {
        playButtonSound();
        openView(button.dataset.open);
    });
});

if (elements.scientificBackBtn) {
    elements.scientificBackBtn.addEventListener("click", () => {
        openView("calculatorView");
    });
}


/* =========================================================
   8. THREE-DOT MENU
   ========================================================= */

function closeMenu() {
    elements.dropdownMenu?.classList.add("hidden");
    elements.menuBtn?.setAttribute("aria-expanded", "false");
}

if (elements.menuBtn) {
    elements.menuBtn.addEventListener("click", event => {
        event.stopPropagation();

        const isHidden =
            elements.dropdownMenu.classList.contains("hidden");

        elements.dropdownMenu.classList.toggle("hidden", !isHidden);

        elements.menuBtn.setAttribute(
            "aria-expanded",
            String(isHidden)
        );
    });
}

document.addEventListener("click", event => {
    if (
        !event.target.closest(".menu-container") &&
        !event.target.closest("#dropdownMenu")
    ) {
        closeMenu();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
});


/* =========================================================
   9. FULLSCREEN
   ========================================================= */

if (elements.fullscreenBtn) {
    elements.fullscreenBtn.addEventListener("click", async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.warn("Fullscreen unavailable:", error);
        }
    });
}


/* =========================================================
   10. SAFE MATHEMATICAL EXPRESSION PARSER
   No eval() or Function()
   ========================================================= */

class MathParser {
    constructor(expression, options = {}) {
        this.expression = String(expression)
            .replace(/×/g, "*")
            .replace(/÷/g, "/")
            .replace(/−/g, "-")
            .replace(/π/g, "pi")
            .replace(/\s+/g, "");

        this.position = 0;
        this.angleMode = options.angleMode || "DEG";
        this.ans = Number(options.ans) || 0;
        this.tokens = this.tokenize();
        this.index = 0;
    }

    tokenize() {
        const tokens = [];
        let i = 0;

        while (i < this.expression.length) {
            const remaining = this.expression.slice(i);

            const numberMatch = remaining.match(
                /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i
            );

            if (numberMatch) {
                tokens.push({
                    type: "number",
                    value: Number(numberMatch[0])
                });

                i += numberMatch[0].length;
                continue;
            }

            const identifierMatch = remaining.match(/^[a-zA-Z]+/);

            if (identifierMatch) {
                tokens.push({
                    type: "identifier",
                    value: identifierMatch[0].toLowerCase()
                });

                i += identifierMatch[0].length;
                continue;
            }

            const character = this.expression[i];

            if ("+-*/^%!".includes(character) || "(),".includes(character)) {
                tokens.push({
                    type: "operator",
                    value: character
                });

                i++;
                continue;
            }

            throw new Error("Invalid character: " + character);
        }

        // Implicit multiplication: 2pi, 2(3+4), (2)(3)
        const expanded = [];

        for (let j = 0; j < tokens.length; j++) {
            const current = tokens[j];
            const previous = expanded[expanded.length - 1];

            if (
                previous &&
                (
                    previous.type === "number" ||
                    previous.value === ")" ||
                    previous.value === "!"
                ) &&
                (
                    current.type === "identifier" ||
                    current.value === "("
                )
            ) {
                expanded.push({
                    type: "operator",
                    value: "*"
                });
            }

            expanded.push(current);
        }

        return expanded;
    }

    peek() {
        return this.tokens[this.index];
    }

    match(value) {
        if (this.peek()?.value === value) {
            this.index++;
            return true;
        }

        return false;
    }

    expect(value) {
        if (!this.match(value)) {
            throw new Error("Expected " + value);
        }
    }

    parse() {
        if (!this.tokens.length) return 0;

        const value = this.parseExpression();

        if (this.index < this.tokens.length) {
            throw new Error("Unexpected expression");
        }

        return cleanNumber(value);
    }

    parseExpression() {
        let value = this.parseTerm();

        while (true) {
            if (this.match("+")) {
                value += this.parseTerm();
            } else if (this.match("-")) {
                value -= this.parseTerm();
            } else {
                break;
            }
        }

        return value;
    }

    parseTerm() {
        let value = this.parseUnary();

        while (true) {
            if (this.match("*")) {
                value *= this.parseUnary();
            } else if (this.match("/")) {
                const divisor = this.parseUnary();

                if (divisor === 0) {
                    throw new Error("Cannot divide by zero");
                }

                value /= divisor;
            } else if (
                this.peek()?.type === "identifier" &&
                this.peek()?.value === "mod"
            ) {
                this.index++;

                const divisor = this.parseUnary();

                if (divisor === 0) {
                    throw new Error("Cannot divide by zero");
                }

                value %= divisor;
            } else {
                break;
            }
        }

        return value;
    }

    parseUnary() {
        if (this.match("+")) return this.parseUnary();
        if (this.match("-")) return -this.parseUnary();

        return this.parsePower();
    }

    parsePower() {
        let value = this.parsePostfix();

        if (this.match("^")) {
            value = Math.pow(value, this.parseUnary());
        }

        return value;
    }

    parsePostfix() {
        let value = this.parsePrimary();

        while (true) {
            if (this.match("!")) {
                value = this.factorial(value);
            } else if (this.match("%")) {
                value /= 100;
            } else {
                break;
            }
        }

        return value;
    }

    parsePrimary() {
        const token = this.peek();

        if (!token) {
            throw new Error("Incomplete expression");
        }

        if (token.type === "number") {
            this.index++;
            return token.value;
        }

        if (this.match("(")) {
            const value = this.parseExpression();
            this.expect(")");
            return value;
        }

        if (token.type === "identifier") {
            this.index++;

            const name = token.value;

            if (name === "pi") return Math.PI;
            if (name === "e") return Math.E;
            if (name === "ans") return this.ans;

            if (this.match("(")) {
                const argument = this.parseExpression();
                this.expect(")");
                return this.applyFunction(name, argument);
            }

            throw new Error("Unknown function: " + name);
        }

        throw new Error("Invalid expression");
    }

    factorial(value) {
        if (
            !Number.isInteger(value) ||
            value < 0 ||
            value > 170
        ) {
            throw new Error("Factorial requires an integer from 0 to 170");
        }

        let result = 1;

        for (let i = 2; i <= value; i++) {
            result *= i;
        }

        return result;
    }

    toRadians(value) {
        return this.angleMode === "DEG"
            ? value * Math.PI / 180
            : value;
    }

    fromRadians(value) {
        return this.angleMode === "DEG"
            ? value * 180 / Math.PI
            : value;
    }

    applyFunction(name, value) {
        switch (name) {
            case "sin":
                return Math.sin(this.toRadians(value));

            case "cos":
                return Math.cos(this.toRadians(value));

            case "tan": {
                const radians = this.toRadians(value);

                if (Math.abs(Math.cos(radians)) < 1e-12) {
                    throw new Error("Undefined tangent");
                }

                return Math.tan(radians);
            }

            case "asin":
                return this.fromRadians(Math.asin(value));

            case "acos":
                return this.fromRadians(Math.acos(value));

            case "atan":
                return this.fromRadians(Math.atan(value));

            case "sqrt":
                if (value < 0) throw new Error("Invalid square root");
                return Math.sqrt(value);

            case "cbrt":
                return Math.cbrt(value);

            case "abs":
                return Math.abs(value);

            case "log":
                if (value <= 0) throw new Error("Invalid logarithm");
                return Math.log10(value);

            case "ln":
                if (value <= 0) throw new Error("Invalid logarithm");
                return Math.log(value);

            case "log2":
                if (value <= 0) throw new Error("Invalid logarithm");
                return Math.log2(value);

            case "exp":
                return Math.exp(value);

            case "sinh":
                return Math.sinh(value);

            case "cosh":
                return Math.cosh(value);

            case "tanh":
                return Math.tanh(value);

            case "square":
                return value * value;

            case "reciprocal":
                if (value === 0) throw new Error("Cannot divide by zero");
                return 1 / value;

            case "power10":
                return Math.pow(10, value);

            default:
                throw new Error("Unknown function: " + name);
        }
    }
}

function evaluateExpression(expression, options = {}) {
    return new MathParser(expression, options).parse();
}


/* =========================================================
   11. HISTORY
   ========================================================= */

function addToHistory(expression, answer, type = "Standard") {
    if (!settings.history) return;

    const entry = {
        id: Date.now() + Math.random(),
        expression: String(expression),
        answer: Number(answer),
        type,
        date: new Date().toISOString()
    };

    calculationHistory.unshift(entry);

    calculationHistory = calculationHistory.slice(0, 100);

    saveStorage(STORAGE_KEYS.history, calculationHistory);

    renderHistory();
}

function renderHistory() {
    if (!elements.historyList) return;

    if (!calculationHistory.length) {
        elements.historyList.innerHTML = `
            <div class="empty-state">
                No calculations yet.
            </div>
        `;
        return;
    }

    elements.historyList.innerHTML = "";

    calculationHistory.forEach(item => {
        const row = document.createElement("div");
        row.className = "history-item";

        const details = document.createElement("div");
        details.className = "history-details";

        const expression = document.createElement("div");
        expression.className = "history-expression";
        expression.textContent = item.expression;

        const answer = document.createElement("div");
        answer.className = "history-answer";
        answer.textContent = "= " + formatNumber(item.answer);

        const meta = document.createElement("small");
        meta.textContent =
            item.type + " • " +
            new Date(item.date).toLocaleString();

        details.append(expression, answer, meta);

        const reuse = document.createElement("button");
        reuse.className = "history-use-btn";
        reuse.type = "button";
        reuse.textContent = "↗";
        reuse.title = "Use this result";

        reuse.addEventListener("click", () => {
            lastAnswer = item.answer;
            saveStorage(STORAGE_KEYS.lastAnswer, lastAnswer);

            standardExpression = String(item.answer);
            updateStandardDisplay();
            openView("calculatorView");
        });

        row.append(details, reuse);
        elements.historyList.appendChild(row);
    });
}

if (elements.clearHistoryBtn) {
    elements.clearHistoryBtn.addEventListener("click", () => {
        if (
            settings.confirmClear &&
            !confirm("Are you sure you want to clear all history?")
        ) {
            return;
        }

        calculationHistory = [];
        saveStorage(STORAGE_KEYS.history, []);
        renderHistory();
    });
}


/* =========================================================
   12. STANDARD CALCULATOR
   ========================================================= */

function updateStandardDisplay() {
    if (!elements.expression || !elements.result) return;

    elements.expression.textContent =
        standardExpression || "0";

    if (!standardExpression) {
        elements.result.textContent = "= 0";
        return;
    }

    try {
        const result = evaluateExpression(standardExpression, {
            ans: lastAnswer
        });

        elements.result.textContent =
            "= " + formatNumber(result);

    } catch {
        elements.result.textContent = "= ...";
    }
}

function standardClear() {
    standardExpression = "";
    updateStandardDisplay();
}

function standardDelete() {
    standardExpression = standardExpression.slice(0, -1);
    updateStandardDisplay();
}

function standardCalculate() {
    if (!standardExpression) return;

    try {
        const expression = standardExpression;

        const answer = evaluateExpression(expression, {
            ans: lastAnswer
        });

        lastAnswer = answer;
        saveStorage(STORAGE_KEYS.lastAnswer, lastAnswer);

        addToHistory(expression, answer, "Standard");

        standardExpression = String(answer);

        elements.expression.textContent = expression;
        elements.result.textContent =
            "= " + formatNumber(answer);

    } catch (error) {
        elements.result.textContent = "Error";
        console.warn(error.message);
    }
}

function standardSign() {
    if (!standardExpression) return;

    try {
        const value = evaluateExpression(standardExpression, {
            ans: lastAnswer
        });

        standardExpression = String(-value);

    } catch {
        standardExpression = "-" + standardExpression;
    }

    updateStandardDisplay();
}

function standardInput(value) {
    if (value === ".") {
        const lastNumber = standardExpression.split(/[+\-*/()]/).pop();

        if (lastNumber.includes(".")) return;

        if (!lastNumber) standardExpression += "0";
    }

    const last = standardExpression.slice(-1);

    if ("+-*/".includes(value)) {
        if (!standardExpression && value !== "-") return;

        if ("+-*/".includes(last)) {
            standardExpression = standardExpression.slice(0, -1);
        }
    }

    standardExpression += value;
    updateStandardDisplay();
}

$$(".keypad .key").forEach(button => {
    button.addEventListener("click", () => {
        playButtonSound();

        const action = button.dataset.action;
        const value = button.dataset.value;

        if (action === "clear") {
            standardClear();
        } else if (action === "delete") {
            standardDelete();
        } else if (action === "calculate") {
            standardCalculate();
        } else if (action === "sign") {
            standardSign();
        } else if (value !== undefined) {
            standardInput(value);
        }
    });
});


/* =========================================================
   13. SCIENTIFIC CALCULATOR
   ========================================================= */

function updateAngleButtons() {
    elements.degreeBtn?.classList.toggle(
        "active",
        angleMode === "DEG"
    );

    elements.radianBtn?.classList.toggle(
        "active",
        angleMode === "RAD"
    );
}

function setAngleMode(mode) {
    if (!["DEG", "RAD"].includes(mode)) return;

    angleMode = mode;
    saveStorage(STORAGE_KEYS.angle, angleMode);

    updateAngleButtons();
    updateScientificDisplay();
}

elements.degreeBtn?.addEventListener("click", () => {
    setAngleMode("DEG");
});

elements.radianBtn?.addEventListener("click", () => {
    setAngleMode("RAD");
});

function updateScientificDisplay() {
    if (!elements.scientificExpression || !elements.scientificResult) {
        return;
    }

    elements.scientificExpression.textContent =
        scientificExpression || "0";

    if (!scientificExpression) {
        elements.scientificResult.textContent = "= 0";
        return;
    }

    try {
        const answer = evaluateExpression(scientificExpression, {
            angleMode,
            ans: lastAnswer
        });

        elements.scientificResult.textContent =
            "= " + formatNumber(answer);

    } catch {
        elements.scientificResult.textContent = "= ...";
    }
}

function scientificClear() {
    scientificExpression = "";
    updateScientificDisplay();
}

function scientificDelete() {
    scientificExpression = scientificExpression.slice(0, -1);
    updateScientificDisplay();
}

function scientificCalculate() {
    if (!scientificExpression) return;

    try {
        const expression = scientificExpression;

        const answer = evaluateExpression(expression, {
            angleMode,
            ans: lastAnswer
        });

        lastAnswer = answer;
        scientificAnswer = answer;

        saveStorage(STORAGE_KEYS.lastAnswer, lastAnswer);

        addToHistory(
            expression,
            answer,
            "Scientific (" + angleMode + ")"
        );

        elements.scientificExpression.textContent = expression;
        elements.scientificResult.textContent =
            "= " + formatNumber(answer);

        scientificExpression = String(answer);

    } catch (error) {
        elements.scientificResult.textContent = "Error";
        console.warn("Scientific calculation:", error.message);
    }
}

function scientificAppend(value) {
    if (value === "decimal") {
        const lastNumber = scientificExpression.split(/[+\-*/()]/).pop();

        if (lastNumber.includes(".")) return;

        if (!lastNumber) scientificExpression += "0";

        scientificExpression += ".";
        updateScientificDisplay();
        return;
    }

    if (["+", "-", "*", "/"].includes(value)) {
        if (!scientificExpression && value !== "-") return;

        const last = scientificExpression.slice(-1);

        if (["+", "-", "*", "/"].includes(last)) {
            scientificExpression = scientificExpression.slice(0, -1);
        }
    }

    scientificExpression += value;
    updateScientificDisplay();
}

function scientificApplyUnary(name) {
    if (!scientificExpression) {
        scientificExpression = name + "(";
    } else {
        scientificExpression += name + "(";
    }

    updateScientificDisplay();
}

function scientificFactorial() {
    if (!scientificExpression) return;

    scientificExpression += "!";
    updateScientificDisplay();
}

function scientificPercent() {
    if (!scientificExpression) return;

    scientificExpression += "%";
    updateScientificDisplay();
}

function scientificSign() {
    if (!scientificExpression) {
        scientificExpression = "-";
    } else {
        try {
            const value = evaluateExpression(scientificExpression, {
                angleMode,
                ans: lastAnswer
            });

            scientificExpression = String(-value);
        } catch {
            scientificExpression = "-(" + scientificExpression + ")";
        }
    }

    updateScientificDisplay();
}

function scientificPower() {
    if (!scientificExpression) return;

    scientificExpression += "^";
    updateScientificDisplay();
}

function scientificReciprocal() {
    if (!scientificExpression) return;

    scientificExpression = "1/(" + scientificExpression + ")";
    updateScientificDisplay();
}

function scientificSquare() {
    if (!scientificExpression) return;

    scientificExpression = "(" + scientificExpression + ")^2";
    updateScientificDisplay();
}

function scientificSecondFunction() {
    secondFunction = !secondFunction;

    const replacements = secondFunction
        ? {
            sin: "asin",
            cos: "acos",
            tan: "atan",
            sinh: "asinh",
            cosh: "acosh",
            tanh: "atanh",
            log: "10^("
        }
        : {
            asin: "sin",
            acos: "cos",
            atan: "tan",
            asinh: "sinh",
            acosh: "cosh",
            atanh: "tanh"
        };

    $$(".sci-key[data-sci]").forEach(button => {
        const key = button.dataset.sci;

        if (replacements[key]) {
            button.dataset.secondValue = replacements[key];
        } else {
            delete button.dataset.secondValue;
        }
    });

    const secondButton = $('[data-sci="second"]');

    if (secondButton) {
        secondButton.classList.toggle("active", secondFunction);
    }
}

function handleScientificButton(value, button) {
    playButtonSound();

    if (secondFunction && button.dataset.secondValue) {
        const secondValue = button.dataset.secondValue;

        if (secondValue === "10^(") {
            scientificExpression += "10^(";
        } else {
            scientificApplyUnary(secondValue);
        }

        secondFunction = false;
        scientificSecondFunction();
        return;
    }

    switch (value) {
        case "clear":
            scientificClear();
            break;

        case "delete":
            scientificDelete();
            break;

        case "calculate":
            scientificCalculate();
            break;

        case "second":
            scientificSecondFunction();
            break;

        case "pi":
            scientificAppend("pi");
            break;

        case "e":
            scientificAppend("e");
            break;

        case "square":
            scientificSquare();
            break;

        case "reciprocal":
            scientificReciprocal();
            break;

        case "abs":
        case "exp":
        case "sqrt":
        case "cbrt":
        case "sin":
        case "cos":
        case "tan":
        case "asin":
        case "acos":
        case "atan":
        case "log":
        case "ln":
        case "sinh":
        case "cosh":
        case "tanh":
        case "log2":
            scientificApplyUnary(value);
            break;

        case "power":
            scientificPower();
            break;

        case "factorial":
            scientificFactorial();
            break;

        case "percent":
            scientificPercent();
            break;

        case "sign":
            scientificSign();
            break;

        case "open":
            scientificAppend("(");
            break;

        case "close":
            scientificAppend(")");
            break;

        case "mod":
            scientificAppend("mod");
            break;

        case "power10":
            scientificAppend("10^(");
            break;

        case "ans":
            scientificAppend("ans");
            break;

        case "decimal":
            scientificAppend("decimal");
            break;

        default:
            scientificAppend(value);
            break;
    }
}

if (elements.scientificKeypad) {
    elements.scientificKeypad.addEventListener("click", event => {
        const button = event.target.closest("[data-sci]");
        if (!button) return;

        handleScientificButton(button.dataset.sci, button);
    });
}

updateAngleButtons();


/* =========================================================
   14. KEYBOARD SUPPORT
   ========================================================= */

document.addEventListener("keydown", event => {
    if (!settings.keyboard) return;

    const target = event.target;

    if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
    ) {
        return;
    }

    if (currentView === "calculatorView") {
        if (/^[0-9.]$/.test(event.key)) {
            standardInput(event.key);
        } else if (["+", "-", "*", "/"].includes(event.key)) {
            standardInput(event.key);
        } else if (event.key === "Enter" || event.key === "=") {
            event.preventDefault();
            standardCalculate();
        } else if (event.key === "Backspace") {
            standardDelete();
        } else if (event.key === "Escape") {
            standardClear();
        }
    }

    if (currentView === "scientificView") {
        if (/^[0-9.]$/.test(event.key)) {
            scientificAppend(event.key === "." ? "decimal" : event.key);
        } else if (["+", "-", "*", "/", "^", "(", ")", "%", "!"].includes(event.key)) {
            scientificAppend(event.key);
        } else if (event.key === "Enter" || event.key === "=") {
            event.preventDefault();
            scientificCalculate();
        } else if (event.key === "Backspace") {
            scientificDelete();
        } else if (event.key === "Escape") {
            scientificClear();
        }
    }
});


/* =========================================================
   15. CONVERTER CONFIGURATION
   ========================================================= */

const CONVERTER_DATA = {
    currency: {
        title: "Currency Converter",
        units: ["USD", "NPR", "EUR", "GBP", "INR", "AUD", "CAD", "JPY", "CNY", "AED", "SAR", "CHF"],
        type: "currency"
    },

    length: {
        title: "Length Converter",
        units: {
            Meter: 1,
            Kilometer: 1000,
            Centimeter: 0.01,
            Millimeter: 0.001,
            Micrometer: 0.000001,
            Mile: 1609.344,
            Yard: 0.9144,
            Foot: 0.3048,
            Inch: 0.0254,
            NauticalMile: 1852
        }
    },

    mass: {
        title: "Mass Converter",
        units: {
            Kilogram: 1,
            Gram: 0.001,
            Milligram: 0.000001,
            MetricTon: 1000,
            Pound: 0.45359237,
            Ounce: 0.028349523125,
            Stone: 6.35029318
        }
    },

    area: {
        title: "Area Converter",
        units: {
            "Square Meter": 1,
            "Square Kilometer": 1000000,
            "Square Centimeter": 0.0001,
            Hectare: 10000,
            Acre: 4046.8564224,
            "Square Foot": 0.09290304,
            "Square Inch": 0.00064516,
            "Square Mile": 2589988.110336
        }
    },

    time: {
        title: "Time Converter",
        units: {
            Second: 1,
            Millisecond: 0.001,
            Minute: 60,
            Hour: 3600,
            Day: 86400,
            Week: 604800,
            Month: 2629800,
            Year: 31557600
        }
    },

    data: {
        title: "Data Storage Converter",
        units: {
            Bit: 1,
            Byte: 8,
            Kilobit: 1000,
            Kilobyte: 8000,
            Megabit: 1000000,
            Megabyte: 8000000,
            Gigabit: 1000000000,
            Gigabyte: 8000000000,
            Terabit: 1000000000000,
            Terabyte: 8000000000000
        }
    },

    volume: {
        title: "Volume Converter",
        units: {
            Liter: 1,
            Milliliter: 0.001,
            "Cubic Meter": 1000,
            "Cubic Centimeter": 0.001,
            Gallon: 3.785411784,
            Quart: 0.946352946,
            Pint: 0.473176473,
            Cup: 0.2365882365,
            "Fluid Ounce": 0.0295735295625
        }
    },

    number: {
        title: "Number System Converter",
        units: ["Decimal", "Binary", "Octal", "Hexadecimal"],
        type: "number"
    },

    speed: {
        title: "Speed Converter",
        units: {
            "Meter/Second": 1,
            "Kilometer/Hour": 0.2777777778,
            "Mile/Hour": 0.44704,
            Knot: 0.514444,
            "Foot/Second": 0.3048
        }
    },

    temperature: {
        title: "Temperature Converter",
        units: ["Celsius", "Fahrenheit", "Kelvin"],
        type: "temperature"
    }
};

let activeCategory = "currency";


/* =========================================================
   16. CONVERTER INITIALIZATION
   ========================================================= */

function populateSelect(select, units) {
    if (!select) return;

    select.innerHTML = "";

    units.forEach(unit => {
        const option = document.createElement("option");
        option.value = unit;
        option.textContent = unit;
        select.appendChild(option);
    });
}

function initializeConverter(category) {
    const config = CONVERTER_DATA[category];
    if (!config) return;

    activeCategory = category;

    elements.converterTitle.textContent = config.title;

    elements.standardConverter?.classList.remove("hidden");
    elements.discountConverter?.classList.add("hidden");
    elements.bmiConverter?.classList.add("hidden");

    elements.refreshRatesBtn?.classList.toggle(
        "hidden",
        category !== "currency"
    );

    let units;

    if (Array.isArray(config.units)) {
        units = config.units;
    } else {
        units = Object.keys(config.units);
    }

    populateSelect(elements.fromUnit, units);
    populateSelect(elements.toUnit, units);

    if (units.length > 1) {
        elements.toUnit.value = units[1];
    }

    if (category === "currency") {
        elements.fromUnit.value = "USD";
        elements.toUnit.value = "NPR";

        initializeCurrency();
    } else {
        if (elements.rateStatus) {
            elements.rateStatus.textContent = "Standard conversion";
        }

        updateConversion();
    }
}

function selectConverterCategory(category) {
    if (category === "discount") {
        activeCategory = category;

        elements.standardConverter?.classList.add("hidden");
        elements.discountConverter?.classList.remove("hidden");
        elements.bmiConverter?.classList.add("hidden");

        elements.converterTitle.textContent = "Discount Calculator";

        elements.refreshRatesBtn?.classList.add("hidden");
        return;
    }

    if (category === "bmi") {
        activeCategory = category;

        elements.standardConverter?.classList.add("hidden");
        elements.discountConverter?.classList.add("hidden");
        elements.bmiConverter?.classList.remove("hidden");

        elements.converterTitle.textContent = "BMI Calculator";

        elements.refreshRatesBtn?.classList.add("hidden");
        return;
    }

    initializeConverter(category);
}

$$("[data-category]").forEach(button => {
    button.addEventListener("click", () => {
        playButtonSound();

        $$(".category-card").forEach(card => {
            card.classList.toggle("active", card === button);
        });

        selectConverterCategory(button.dataset.category);
    });
});


/* =========================================================
   17. CURRENCY CONVERTER
   Uses Frankfurter API
   ========================================================= */

async function initializeCurrency() {
    if (elements.rateStatus) {
        elements.rateStatus.textContent = "Loading exchange rates...";
    }

    await fetchCurrencyRates();
}

async function fetchCurrencyRates() {
    if (activeCategory !== "currency") return;

    const base = elements.fromUnit?.value || "USD";

    if (elements.rateStatus) {
        elements.rateStatus.textContent = "Updating rates...";
    }

    try {
        const response = await fetch(
            `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}`
        );

        if (!response.ok) {
            throw new Error("Exchange rate service unavailable");
        }

        const data = await response.json();

        currencyRates = {
            [base]: 1,
            ...data.rates
        };

        currencyLastUpdated = data.date;

        if (elements.rateStatus) {
            elements.rateStatus.textContent =
                "Rates dated " + data.date;
        }

        updateConversion();

    } catch (error) {
        currencyRates = {};

        if (elements.rateStatus) {
            elements.rateStatus.textContent =
                "Live rates unavailable. Check internet.";
        }

        if (elements.conversionResult) {
            elements.conversionResult.textContent =
                "Unable to load exchange rates. Try refreshing.";
        }

        console.warn("Currency API error:", error);
    }
}

function convertCurrency(value, from, to) {
    if (!currencyRates[from] || !currencyRates[to]) {
        throw new Error("Exchange rate unavailable for selected currency");
    }

    return value / currencyRates[from] * currencyRates[to];
}

elements.fromUnit?.addEventListener("change", () => {
    if (activeCategory === "currency") {
        fetchCurrencyRates();
    } else {
        updateConversion();
    }
});

elements.toUnit?.addEventListener("change", updateConversion);

elements.fromValue?.addEventListener("input", updateConversion);

elements.convertBtn?.addEventListener("click", () => {
    playButtonSound();

    if (activeCategory === "currency") {
        updateConversion();
    } else {
        updateConversion();
    }
});

elements.refreshRatesBtn?.addEventListener("click", fetchCurrencyRates);


/* =========================================================
   18. GENERAL UNIT CONVERSION
   ========================================================= */

function convertTemperature(value, from, to) {
    let celsius;

    if (from === "Celsius") celsius = value;
    else if (from === "Fahrenheit") celsius = (value - 32) * 5 / 9;
    else if (from === "Kelvin") celsius = value - 273.15;
    else throw new Error("Unknown temperature unit");

    if (to === "Celsius") return celsius;
    if (to === "Fahrenheit") return celsius * 9 / 5 + 32;
    if (to === "Kelvin") return celsius + 273.15;

    throw new Error("Unknown temperature unit");
}

function convertNumberSystem(value, from, to) {
    if (!Number.isFinite(value)) {
        throw new Error("Enter a valid number");
    }

    const bases = {
        Decimal: 10,
        Binary: 2,
        Octal: 8,
        Hexadecimal: 16
    };

    const input = String(value).trim();

    const decimal = parseInt(input, bases[from]);

    if (!Number.isFinite(decimal) || Number.isNaN(decimal)) {
        throw new Error("Invalid " + from + " number");
    }

    return decimal.toString(bases[to]).toUpperCase();
}

function updateConversion() {
    if (
        !elements.fromValue ||
        !elements.fromUnit ||
        !elements.toUnit ||
        !elements.toValue
    ) return;

    if (
        activeCategory === "discount" ||
        activeCategory === "bmi"
    ) return;

    const rawValue = elements.fromValue.value;
    const value = Number(rawValue);

    if (rawValue === "" || !Number.isFinite(value)) {
        elements.toValue.value = "";
        elements.conversionResult.textContent =
            "Enter a valid value to convert.";
        return;
    }

    const from = elements.fromUnit.value;
    const to = elements.toUnit.value;

    try {
        let result;

        if (activeCategory === "currency") {
            result = convertCurrency(value, from, to);
        } else if (activeCategory === "temperature") {
            result = convertTemperature(value, from, to);
        } else if (activeCategory === "number") {
            result = convertNumberSystem(value, from, to);
        } else {
            const config = CONVERTER_DATA[activeCategory];

            if (!config || !config.units) {
                throw new Error("Unsupported conversion");
            }

            result = value *
                config.units[from] /
                config.units[to];
        }

        const formatted = typeof result === "number"
            ? formatNumber(result)
            : result;

        elements.toValue.value = formatted;

        elements.conversionResult.textContent =
            `${formatNumber(value)} ${from} = ${formatted} ${to}`;

    } catch (error) {
        elements.toValue.value = "";
        elements.conversionResult.textContent = error.message;
    }
}


/* =========================================================
   19. SWAP UNITS
   ========================================================= */

elements.swapUnits?.addEventListener("click", () => {
    playButtonSound();

    const previousFrom = elements.fromUnit.value;
    const previousTo = elements.toUnit.value;

    elements.fromUnit.value = previousTo;
    elements.toUnit.value = previousFrom;

    if (activeCategory === "currency") {
        fetchCurrencyRates();
    } else {
        updateConversion();
    }
});


/* =========================================================
   20. DISCOUNT CALCULATOR
   ========================================================= */

function calculateDiscount() {
    const original = Number(elements.originalPrice?.value);
    const percent = Number(elements.discountPercent?.value);

    if (
        !Number.isFinite(original) ||
        !Number.isFinite(percent) ||
        original < 0 ||
        percent < 0 ||
        percent > 100
    ) {
        elements.discountAmount.textContent = "0";
        elements.finalPrice.textContent = "0";
        elements.totalSavings.textContent = "0";
        return;
    }

    const discount = original * percent / 100;
    const final = original - discount;

    elements.discountAmount.textContent = formatNumber(discount);
    elements.finalPrice.textContent = formatNumber(final);
    elements.totalSavings.textContent = formatNumber(discount);
}

elements.originalPrice?.addEventListener("input", calculateDiscount);
elements.discountPercent?.addEventListener("input", calculateDiscount);


/* =========================================================
   21. BMI CALCULATOR
   ========================================================= */

function calculateBMI() {
    const weight = Number(elements.bmiWeight?.value);
    const height = Number(elements.bmiHeight?.value);
    const unit = elements.heightUnit?.value || "cm";

    if (
        !Number.isFinite(weight) ||
        !Number.isFinite(height) ||
        weight <= 0 ||
        height <= 0
    ) {
        elements.bmiValue.textContent = "--";
        elements.bmiCategory.textContent =
            "Enter valid weight and height.";
        return;
    }

    let heightInMeters;

    switch (unit) {
        case "cm":
            heightInMeters = height / 100;
            break;

        case "m":
            heightInMeters = height;
            break;

        case "ft":
            heightInMeters = height * 0.3048;
            break;

        case "inch":
            heightInMeters = height * 0.0254;
            break;

        default:
            return;
    }

    const bmi = weight / (heightInMeters * heightInMeters);

    let category;

    if (bmi < 18.5) category = "Underweight";
    else if (bmi < 25) category = "Normal weight";
    else if (bmi < 30) category = "Overweight";
    else category = "Obesity range";

    elements.bmiValue.textContent = bmi.toFixed(2);
    elements.bmiCategory.textContent = category;
}

elements.calculateBMI?.addEventListener("click", () => {
    playButtonSound();
    calculateBMI();
});


/* =========================================================
   22. THEME MANAGEMENT
   ========================================================= */

function applyTheme(isDark) {
    document.body.classList.toggle("dark-mode", isDark);
    document.documentElement.classList.toggle("dark-mode", isDark);

    if (elements.darkModeSetting) {
        elements.darkModeSetting.checked = isDark;
    }

    saveStorage(STORAGE_KEYS.theme, isDark ? "dark" : "light");
}

function toggleTheme() {
    const isDark = !document.body.classList.contains("dark-mode");

    settings.darkMode = isDark;

    applyTheme(isDark);
    saveStorage(STORAGE_KEYS.settings, settings);
}

elements.menuThemeBtn?.addEventListener("click", () => {
    playButtonSound();
    toggleTheme();
});

elements.darkModeSetting?.addEventListener("change", () => {
    settings.darkMode = elements.darkModeSetting.checked;

    applyTheme(settings.darkMode);
    saveSettings();
});


/* =========================================================
   23. SETTINGS
   ========================================================= */

function saveSettings() {
    saveStorage(STORAGE_KEYS.settings, settings);
}

function loadSettings() {
    elements.darkModeSetting.checked = Boolean(settings.darkMode);
    elements.separatorSetting.checked = Boolean(settings.separator);
    elements.precisionSetting.value = String(settings.precision);
    elements.soundSetting.checked = Boolean(settings.sound);
    elements.keyboardSetting.checked = Boolean(settings.keyboard);
    elements.historySetting.checked = Boolean(settings.history);
    elements.confirmSetting.checked = Boolean(settings.confirmClear);
    elements.defaultPageSetting.value = settings.defaultPage;

    applyTheme(settings.darkMode);
}

elements.separatorSetting?.addEventListener("change", () => {
    settings.separator = elements.separatorSetting.checked;
    saveSettings();

    updateStandardDisplay();
    updateScientificDisplay();
    updateConversion();
});

elements.precisionSetting?.addEventListener("change", () => {
    settings.precision = Number(elements.precisionSetting.value);
    saveSettings();

    updateStandardDisplay();
    updateScientificDisplay();
    updateConversion();
});

elements.soundSetting?.addEventListener("change", () => {
    settings.sound = elements.soundSetting.checked;
    saveSettings();
});

elements.keyboardSetting?.addEventListener("change", () => {
    settings.keyboard = elements.keyboardSetting.checked;
    saveSettings();
});

elements.historySetting?.addEventListener("change", () => {
    settings.history = elements.historySetting.checked;
    saveSettings();
});

elements.confirmSetting?.addEventListener("change", () => {
    settings.confirmClear = elements.confirmSetting.checked;
    saveSettings();
});

elements.defaultPageSetting?.addEventListener("change", () => {
    settings.defaultPage = elements.defaultPageSetting.value;
    saveSettings();
});

elements.resetSettingsBtn?.addEventListener("click", () => {
    const confirmed = confirm(
        "Reset all settings to their default values?"
    );

    if (!confirmed) return;

    settings = { ...DEFAULT_SETTINGS };

    saveSettings();
    loadSettings();

    openView("calculatorView");
});


/* =========================================================
   24. INITIALIZATION
   ========================================================= */

function initializeApp() {
    loadSettings();

    updateStandardDisplay();
    updateScientificDisplay();
    updateAngleButtons();

    renderHistory();

    // Initial converter category
    selectConverterCategory("currency");

    // Open the configured starting page.
    const startPage = viewIds.includes(settings.defaultPage)
        ? settings.defaultPage
        : "calculatorView";

    // Scientific Calculator is intentionally not a default
    // opening-page option in the supplied HTML.
    openView(startPage);

    console.log(
        "SmartCalculator v2.3.0 initialized successfully."
    );
}

initializeApp();


/* =========================================================
   END OF SMARTCALCULATOR SCRIPT
   Developer: Sajan Khadka
   ========================================================= */
