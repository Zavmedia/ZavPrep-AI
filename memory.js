const PROFILE_API = "/api/profile";
const AUTH_MODE_API = typeof AUTH_API === "string" ? AUTH_API : "/api/auth";
const ACCESS_STORAGE_KEY = typeof KEY === "string" ? KEY : "zenprep-access-code";
const LEARNER_KEY = "zenprep-learner-name";
const LAST_EXAM_KEY = "zenprep-last-exam";
const HOSTED_TOKEN = "__hosted_proxy__";

let memoryFlushTimer = 0;
let memoryLoadRequestId = 0;

function safeEsc(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (match) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[match];
  });
}

function sameText(left, right) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

function normalizeLearnerName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 60);
}

function ensureMemoryState() {
  const storedLearner = normalizeLearnerName(sessionStorage.getItem(LEARNER_KEY) || "");
  S.memory = S.memory || {};
  S.memory.learnerName = normalizeLearnerName(S.memory.learnerName || storedLearner);
  S.memory.profile = S.memory.profile || null;
  S.memory.currentExam = S.memory.currentExam || null;
  S.memory.training = S.memory.training || null;
  S.memory.storageMode = S.memory.storageMode || null;
  S.memory.queue = Array.isArray(S.memory.queue) ? S.memory.queue : [];
  S.memory.syncing = Boolean(S.memory.syncing);
  S.memory.lastError = S.memory.lastError || "";
  return S.memory;
}

function learnerName() {
  return ensureMemoryState().learnerName || "";
}

function activeExamName() {
  return String(S.exam?.name || sessionStorage.getItem(LAST_EXAM_KEY) || "").trim();
}

function storageLabel(mode) {
  if (mode === "upstash-redis") return "Cloud memory";
  if (mode === "memory-fallback") return "Server memory";
  return "Pending";
}

function ensureHostedAccessState() {
  if (S.authRequired === false && !S.key) {
    S.key = HOSTED_TOKEN;
    S.auth = true;
    if (S.api === "locked") {
      S.api = "ready";
    }
  }
}

function showMemoryNote(message) {
  if (typeof note === "function") {
    note(message);
  }
}

function rememberLearner(value) {
  const clean = normalizeLearnerName(value);
  const memory = ensureMemoryState();
  const changed = clean !== memory.learnerName;
  memory.learnerName = clean;
  if (changed) {
    memory.profile = null;
    memory.currentExam = null;
    memory.training = null;
    memory.queue = [];
  }
  if (clean) sessionStorage.setItem(LEARNER_KEY, clean);
  else sessionStorage.removeItem(LEARNER_KEY);
  return clean;
}

function clearLearnerMemory() {
  const memory = ensureMemoryState();
  memory.learnerName = "";
  memory.profile = null;
  memory.currentExam = null;
  memory.training = null;
  memory.storageMode = null;
  memory.queue = [];
  memory.syncing = false;
  memory.lastError = "";
  sessionStorage.removeItem(LEARNER_KEY);
  sessionStorage.removeItem(LAST_EXAM_KEY);
}

function serializeEvent(event) {
  return {
    t: String(event?.t || "").trim().slice(0, 60),
    d: String(event?.d || "").trim().toLowerCase().slice(0, 32),
    ok: Boolean(event?.ok),
    sc: Number(event?.sc || 0),
    l: String(event?.l || "Training event").trim().slice(0, 80),
    det: String(event?.det || "").trim().slice(0, 180)
  };
}

function profileHeaders(accessCode) {
  const code = String(accessCode || S.key || sessionStorage.getItem(ACCESS_STORAGE_KEY) || "").trim();
  return code
    ? {
        "Content-Type": "application/json",
        "x-access-code": code
      }
    : {
        "Content-Type": "application/json"
      };
}

async function postProfile(body, accessCode) {
  ensureHostedAccessState();
  const response = await fetch(PROFILE_API, {
    method: "POST",
    headers: profileHeaders(accessCode),
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    if (response.status === 401) {
      S.auth = false;
      S.api = "locked";
      S.key = "";
      sessionStorage.removeItem(ACCESS_STORAGE_KEY);
    }
    throw new Error(data.error || "profile");
  }

  return data;
}

function applyExamProgress(exam) {
  if (!exam) {
    return;
  }

  const topics = {};
  const difficulties = {};

  Object.entries(exam.topics || {}).forEach(function (entry) {
    const label = entry[0];
    const bucket = entry[1] || {};
    topics[label] = {
      a: Number(bucket.attempts || 0),
      c: Number(bucket.correct || 0)
    };
  });

  Object.entries(exam.difficulties || {}).forEach(function (entry) {
    const label = entry[0];
    const bucket = entry[1] || {};
    difficulties[label] = {
      a: Number(bucket.attempts || 0),
      c: Number(bucket.correct || 0)
    };
  });

  S.prog = {
    a: Number(exam.attempts || 0),
    c: Number(exam.correct || 0),
    w: Number(exam.wrong || 0),
    acc: Number(exam.accuracy || 0),
    net: Number(exam.net || 0),
    st: Number(exam.streak || 0),
    best: Number(exam.bestStreak || 0),
    t: topics,
    d: difficulties,
    feed: (exam.recent || []).slice(0, 8).map(function (item) {
      return {
        l: item.label || "Training event",
        d: item.detail || item.topic || "",
        s: Number(item.score || 0),
        t: new Date(item.at || Date.now()).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })
      };
    })
  };
}

function applyProfilePayload(data) {
  const memory = ensureMemoryState();
  memory.profile = data?.profile || null;
  memory.currentExam = data?.currentExam || null;
  memory.training = data?.training || null;
  memory.storageMode = data?.storageMode || null;
  memory.lastError = "";

  if (data?.profile?.learnerName) {
    rememberLearner(data.profile.learnerName);
  }

  if (data?.currentExam && (!activeExamName() || sameText(data.currentExam.name, activeExamName()))) {
    applyExamProgress(data.currentExam);
  }
}

async function loadLearnerProfile(accessCode) {
  const memory = ensureMemoryState();
  const name = learnerName();
  if (!name) {
    return null;
  }

  const requestId = ++memoryLoadRequestId;

  try {
    const data = await postProfile(
      {
        action: "load",
        learnerName: name,
        examName: activeExamName()
      },
      accessCode
    );

    if (requestId !== memoryLoadRequestId) {
      return data;
    }

    applyProfilePayload(data);
    if (typeof draw === "function") draw();
    return data;
  } catch (error) {
    memory.lastError = error.message || "profile";
    if (!["nocode", "Unauthorized"].includes(memory.lastError)) {
      showMemoryNote("Could not load learner memory. Session tracking stays available.");
    }
    return null;
  }
}

async function flushMemoryQueue() {
  const memory = ensureMemoryState();
  if (memory.syncing || !memory.queue.length) {
    return;
  }

  const name = learnerName();
  const examName = activeExamName();
  if (!name || !examName) {
    return;
  }

  const events = memory.queue.splice(0, memory.queue.length);
  memory.syncing = true;

  try {
    const data = await postProfile({
      action: "trackBatch",
      learnerName: name,
      examName,
      events
    });
    applyProfilePayload(data);
    if (typeof draw === "function") draw();
  } catch (error) {
    memory.queue = events.concat(memory.queue);
    memory.lastError = error.message || "profile";
  } finally {
    memory.syncing = false;
  }
}

function queueMemoryEvent(event) {
  const memory = ensureMemoryState();
  if (!learnerName() || !activeExamName()) {
    return;
  }

  memory.queue.push(serializeEvent(event));
  clearTimeout(memoryFlushTimer);
  memoryFlushTimer = setTimeout(flushMemoryQueue, 700);
}

function ensureMemoryStyle() {
  if (document.getElementById("memory-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "memory-style";
  style.textContent = [
    ".memory-grid{display:grid;gap:12px;margin-top:16px}",
    ".memory-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}",
    ".memory-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}",
    ".memory-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}",
    ".memory-warning{margin-top:12px;color:#ffd98a}",
    "@media(max-width:720px){.memory-grid.two{grid-template-columns:1fr}}"
  ].join("");
  document.head.appendChild(style);
}

function syncHostedUi() {
  if (S.authRequired !== false) {
    return;
  }

  document.querySelectorAll("[data-a='key']").forEach(function (button) {
    button.remove();
  });

  const heroCopy = document.querySelector(".hero-copy p");
  if (heroCopy) {
    heroCopy.innerHTML =
      "Search an exam, run an animated loading sequence, and move into one dashboard with overview, practice, teaching, doubt support, progress tracking, and exam-mode mocks. The model is fixed to <code>" +
      safeEsc(typeof MODEL === "string" ? MODEL : "") +
      "</code>. On this deployment the OpenRouter key stays on the server and every user runs through the hosted proxy automatically.";
  }

  const modalCopy = document.querySelector(".modal p");
  if (modalCopy) {
    modalCopy.textContent = "This deployment is already using the hosted server-side API key. End users never enter an API key.";
  }

  const statusNode = document.querySelector(".status:not(.live)");
  if (statusNode) {
    statusNode.textContent = "Hosted key ready";
  }
}

async function detectAccessMode() {
  try {
    const response = await fetch(AUTH_MODE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        probe: true,
        code: S.key && S.key !== HOSTED_TOKEN ? S.key : ""
      })
    });
    const data = await response.json().catch(function () {
      return {};
    });
    S.authRequired = data.required !== false;
  } catch (error) {
    S.authRequired = true;
  }

  if (S.authRequired === false) {
    S.key = HOSTED_TOKEN;
    S.auth = true;
    S.modal = false;
    if (S.api === "locked") {
      S.api = "ready";
    }
  } else if (S.key === HOSTED_TOKEN) {
    S.key = "";
    S.auth = false;
    S.api = "locked";
  }

  if (typeof draw === "function") {
    draw();
  }
}

function syncLearnerField() {
  const input = document.getElementById("learnerin");
  if (input && document.activeElement !== input) {
    input.value = learnerName();
  }
}

function ensureLearnerField() {
  const form = document.getElementById("keyf");
  if (!form || form.querySelector("#learnerin")) {
    syncLearnerField();
    return;
  }

  const learnerInput = document.createElement("input");
  learnerInput.id = "learnerin";
  learnerInput.className = "field";
  learnerInput.type = "text";
  learnerInput.autocomplete = "name";
  learnerInput.placeholder = "Learner name for personal memory";
  learnerInput.value = learnerName();

  const hint = document.createElement("p");
  hint.style.margin = "0";
  hint.style.color = "var(--muted)";
  hint.textContent = "Each friend should use a different learner name so progress and training stay separate.";

  const keyInput = document.getElementById("keyin");
  form.insertBefore(learnerInput, keyInput || form.firstChild);
  form.insertBefore(hint, keyInput || learnerInput.nextSibling);
}

function renderLearnerPill() {
  if (S.screen !== "dash") {
    return;
  }

  const stats = document.querySelector(".top .stats");
  if (!stats) {
    return;
  }

  const existing = stats.querySelector("[data-memory-pill='learner']");
  if (existing) {
    existing.remove();
  }

  const pill = document.createElement("div");
  pill.className = "pill";
  pill.dataset.memoryPill = "learner";
  pill.textContent = learnerName() ? "Learner · " + learnerName() : "Learner pending";
  stats.insertBefore(pill, stats.firstChild);
}

function listMarkup(items, emptyText) {
  if (!items.length) {
    return "<p>" + safeEsc(emptyText) + "</p>";
  }

  return (
    "<ul class='list'>" +
    items
      .map(function (item) {
        return (
          "<li><strong>" +
          safeEsc(item.label || item.topic || "") +
          "</strong> · " +
          safeEsc(String(item.accuracy || 0)) +
          "% accuracy across " +
          safeEsc(String(item.attempts || 0)) +
          " attempts</li>"
        );
      })
      .join("") +
    "</ul>"
  );
}

function recommendationMarkup(items) {
  if (!items.length) {
    return "<p>Start answering practice questions to generate an individual training plan.</p>";
  }

  return (
    "<div class='stack'>" +
    items
      .map(function (item) {
        return (
          "<div class='surface'><strong>" +
          safeEsc(item.topic || "Mixed Revision") +
          "</strong><p>" +
          safeEsc(item.action || "") +
          "</p></div>"
        );
      })
      .join("") +
    "</div>"
  );
}

function renderTrainingPanel() {
  if (S.screen !== "dash" || !["overview", "progress"].includes(S.tab)) {
    return;
  }

  const host = document.querySelector(".dash .pane.card");
  if (!host || document.getElementById("memory-training-panel")) {
    return;
  }

  const memory = ensureMemoryState();
  if (!learnerName()) {
    return;
  }

  const exam = memory.currentExam;
  const training = memory.training;
  const weakAreas = training?.weakAreas || [];
  const strongAreas = training?.strongAreas || [];
  const recommendations = training?.recommendations || [];

  const panel = document.createElement("div");
  panel.id = "memory-training-panel";
  panel.className = "memory-grid";
  panel.innerHTML = [
    "<div class='surface'>",
    "<div class='row'><div><div class='ey'>Learner memory</div><h3>" + safeEsc(learnerName()) + "</h3><p>" +
      safeEsc(
        training
          ? "Your coaching now adapts to recorded answers, streaks, and weak-topic accuracy."
          : "Memory is active. Answer practice or mock questions to generate a personal training plan."
      ) +
      "</p></div><div class='memory-meta'>",
    "<div class='pill'>Storage · " + safeEsc(storageLabel(memory.storageMode)) + "</div>",
    training ? "<div class='pill'>Level · " + safeEsc(training.level) + "</div>" : "",
    training ? "<div class='pill'>Readiness · " + safeEsc(String(training.readiness)) + "%</div>" : "",
    exam ? "<div class='pill'>Recorded · " + safeEsc(String(exam.attempts || 0)) + " answers</div>" : "",
    "</div></div>",
    memory.storageMode === "memory-fallback"
      ? "<p class='memory-warning'>Durable cloud memory is not configured yet. Vercel cold starts can clear server memory until Upstash Redis is added.</p>"
      : "",
    "<div class='memory-actions'>",
    "<button class='chip on' type='button' data-memory-reload='1'>Refresh memory</button>",
    weakAreas[0]
      ? "<button class='chip' type='button' data-memory-focus='" + safeEsc(weakAreas[0].label) + "'>Train " + safeEsc(weakAreas[0].label) + "</button>"
      : "",
    "</div></div>",
    "<div class='memory-grid two'>",
    "<div class='surface'><h3>Areas to improve</h3>" + listMarkup(weakAreas, "No weak areas detected yet.") + "</div>",
    "<div class='surface'><h3>Current strengths</h3>" + listMarkup(strongAreas, "Strengths will appear after more answered questions.") + "</div>",
    "</div>",
    "<div class='surface'><h3>Individual training plan</h3>" + recommendationMarkup(recommendations) + "</div>"
  ].join("");

  host.appendChild(panel);
}

const originalDraw = draw;
draw = function () {
  ensureMemoryState();
  ensureHostedAccessState();
  originalDraw();
  ensureMemoryStyle();
  ensureLearnerField();
  renderLearnerPill();
  renderTrainingPanel();
  syncHostedUi();
  syncLearnerField();
};

const originalTrack = track;
track = function (event) {
  originalTrack(event);
  queueMemoryEvent(event);
};

const originalStartExam = startExam;
startExam = function (name) {
  const storedName = learnerName();
  if (!storedName) {
    S.modal = 1;
    draw();
    showMemoryNote("Enter learner name so every user gets separate progress memory.");
    return;
  }

  const memory = ensureMemoryState();
  memory.currentExam = null;
  memory.training = null;
  memory.lastError = "";
  ensureHostedAccessState();
  sessionStorage.setItem(LAST_EXAM_KEY, String(name || "").trim());
  originalStartExam(name);
  loadLearnerProfile();
};

const originalVerifyAccess = verifyAccess;
verifyAccess = async function (code) {
  if (S.authRequired === false) {
    ensureHostedAccessState();
    return { ok: true, required: false };
  }
  const result = await originalVerifyAccess(code);
  if (learnerName()) {
    loadLearnerProfile(code);
  }
  return result;
};

const originalCall = call;
call = async function (systemPrompt, userPrompt, maxTokens, temperature) {
  ensureHostedAccessState();
  const training = ensureMemoryState().training;
  const exam = ensureMemoryState().currentExam;

  if (training && exam && typeof userPrompt === "string") {
    const weak = (training.weakAreas || []).map(function (item) {
      return item.label + " (" + item.accuracy + "%)";
    });
    const strong = (training.strongAreas || []).map(function (item) {
      return item.label + " (" + item.accuracy + "%)";
    });

    userPrompt += [
      "",
      "Learner profile:",
      "Name: " + learnerName(),
      "Level: " + training.level,
      "Readiness: " + training.readiness + "%",
      "Weak areas: " + (weak.join(", ") || "Not enough data"),
      "Strong areas: " + (strong.join(", ") || "Not enough data"),
      "Personalize the response so the learner improves weak areas without wasting time on mastered basics."
    ].join("\n");
  }

  return originalCall(systemPrompt, userPrompt, maxTokens, temperature);
};

document.addEventListener(
  "submit",
  function (event) {
    if (event.target.id !== "keyf") {
      return;
    }

    const input = document.getElementById("learnerin");
    const clean = rememberLearner(input?.value || "");

    if (!clean) {
      event.preventDefault();
      event.stopImmediatePropagation();
      ensureLearnerField();
      showMemoryNote("Enter learner name so progress and training stay individual.");
      if (input) input.focus();
    }
  },
  true
);

document.addEventListener(
  "click",
  function (event) {
    const actionButton = event.target.closest("[data-a]");
    if (actionButton?.dataset.a === "clear-key") {
      if (S.authRequired === false) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      clearLearnerMemory();
    }

    const focusButton = event.target.closest("[data-memory-focus]");
    if (focusButton) {
      const topic = String(focusButton.dataset.memoryFocus || "").trim();
      if (!topic) {
        return;
      }
      S.topic = topic;
      S.tab = "practice";
      draw();
      genPractice(true);
      showMemoryNote("Loaded a focused practice set for " + topic + ".");
      return;
    }

    const reloadButton = event.target.closest("[data-memory-reload]");
    if (reloadButton) {
      loadLearnerProfile();
    }
  },
  true
);

document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    flushMemoryQueue();
  }
});

ensureMemoryState();
detectAccessMode();
draw();
