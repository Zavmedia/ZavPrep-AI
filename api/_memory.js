// _memory.js — Student profile storage using Firebase Firestore
// Falls back to in-memory if Firebase is not configured

const { firestoreGet, firestoreSet } = require("./_firebase");
const crypto = require("crypto");

const memoryStore = globalThis.__zenprepProfiles || (globalThis.__zenprepProfiles = new Map());

function getAllowedCodes() {
  return String(process.env.APP_ACCESS_CODES || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
}

function getCode(req) {
  return String(req.headers["x-access-code"] || req.body?.code || "").trim();
}

function isAuthorized(req) {
  const allowed = getAllowedCodes();
  const code = getCode(req);
  if (!allowed.length) return true;
  return Boolean(code && allowed.includes(code));
}

function normalizeLearnerName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").slice(0, 60);
}

function learnerIdFromName(name) {
  return normalizeLearnerName(name).toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "learner";
}

function examIdFromName(name) {
  return String(name || "").trim().toLowerCase()
    .replace(/\s+/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildDocId(accessCode, learnerName) {
  const learnerId = learnerIdFromName(learnerName);
  const ns = crypto.createHash("sha256")
    .update(String(accessCode || "public")).digest("hex").slice(0, 12);
  return `${ns}_${learnerId}`;
}

function hasFirebase() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

async function getStoredProfile(accessCode, learnerName) {
  const docId = buildDocId(accessCode, learnerName);
  if (hasFirebase()) {
    try {
      return await firestoreGet("profiles", docId);
    } catch (e) {
      console.error("Firebase get failed, using memory:", e.message);
    }
  }
  return memoryStore.get(docId) || null;
}

async function saveStoredProfile(accessCode, learnerName, profile) {
  const docId = buildDocId(accessCode, learnerName);
  if (hasFirebase()) {
    try {
      await firestoreSet("profiles", docId, profile);
      return;
    } catch (e) {
      console.error("Firebase set failed, using memory:", e.message);
    }
  }
  memoryStore.set(docId, profile);
}

function createEmptyExam(name) {
  return {
    name,
    attempts: 0, correct: 0, wrong: 0,
    net: 0, accuracy: 0, streak: 0, bestStreak: 0,
    topics: {}, difficulties: {},
    recent: [],
    mockHistory: [],
    updatedAt: new Date().toISOString()
  };
}

function createEmptyProfile(learnerName) {
  const now = new Date().toISOString();
  return {
    learnerId: learnerIdFromName(learnerName),
    learnerName: normalizeLearnerName(learnerName),
    createdAt: now,
    updatedAt: now,
    lastExamName: "",
    lastSeenAt: now,
    overall: {
      attempts: 0, correct: 0, wrong: 0,
      net: 0, accuracy: 0, streak: 0, bestStreak: 0
    },
    exams: {}
  };
}

function ensureBucket(container, label) {
  if (!container[label]) {
    container[label] = {
      label, attempts: 0, correct: 0, wrong: 0, net: 0, accuracy: 0, lastSeenAt: null
    };
  }
  return container[label];
}

function updateBucket(bucket, event) {
  bucket.attempts += 1;
  if (event.ok) bucket.correct += 1;
  else bucket.wrong += 1;
  bucket.net = Number((bucket.net + Number(event.sc || 0)).toFixed(2));
  bucket.accuracy = bucket.attempts ? Number(((bucket.correct / bucket.attempts) * 100).toFixed(1)) : 0;
  bucket.lastSeenAt = new Date().toISOString();
}

function applyTrackEvent(profile, examName, event) {
  const examId = examIdFromName(examName);
  if (!examId) return;

  profile.exams[examId] = profile.exams[examId] || createEmptyExam(examName);
  const exam = profile.exams[examId];

  exam.attempts += 1;
  if (event.ok) {
    exam.correct += 1;
    exam.streak += 1;
    exam.bestStreak = Math.max(exam.bestStreak, exam.streak);
  } else {
    exam.wrong += 1;
    exam.streak = 0;
  }
  exam.net = Number((exam.net + Number(event.sc || 0)).toFixed(2));
  exam.accuracy = exam.attempts ? Number(((exam.correct / exam.attempts) * 100).toFixed(1)) : 0;
  exam.updatedAt = new Date().toISOString();

  const overall = profile.overall;
  overall.attempts += 1;
  if (event.ok) {
    overall.correct += 1;
    overall.streak += 1;
    overall.bestStreak = Math.max(overall.bestStreak, overall.streak);
  } else {
    overall.wrong += 1;
    overall.streak = 0;
  }
  overall.net = Number((overall.net + Number(event.sc || 0)).toFixed(2));
  overall.accuracy = overall.attempts
    ? Number(((overall.correct / overall.attempts) * 100).toFixed(1)) : 0;

  if (event.t) updateBucket(ensureBucket(exam.topics, event.t), event);
  if (event.d) updateBucket(ensureBucket(exam.difficulties, event.d), event);

  exam.recent.unshift({
    label: event.l || "Training event",
    detail: event.det || "",
    topic: event.t || "",
    difficulty: event.d || "",
    ok: Boolean(event.ok),
    score: Number(event.sc || 0),
    at: new Date().toISOString()
  });
  exam.recent = exam.recent.slice(0, 30);
  profile.updatedAt = new Date().toISOString();
  profile.lastSeenAt = new Date().toISOString();
}

function applyMockResult(profile, examName, mockResult) {
  const examId = examIdFromName(examName);
  if (!examId) return;
  profile.exams[examId] = profile.exams[examId] || createEmptyExam(examName);
  const exam = profile.exams[examId];
  if (!exam.mockHistory) exam.mockHistory = [];
  exam.mockHistory.unshift({
    title: mockResult.title || examName,
    score: mockResult.score,
    accuracy: mockResult.accuracy,
    correct: mockResult.correct,
    wrong: mockResult.wrong,
    unattempted: mockResult.unattempted,
    sections: mockResult.sections || [],
    at: new Date().toISOString()
  });
  exam.mockHistory = exam.mockHistory.slice(0, 10);
  profile.updatedAt = new Date().toISOString();
}

function computeTraining(exam) {
  const topicRows = Object.values(exam.topics || {});
  const rankedWeak = topicRows
    .map((t) => ({ ...t, priority: ((100 - t.accuracy) * Math.log(t.attempts + 1)) }))
    .sort((a, b) => b.priority - a.priority).slice(0, 3);
  const rankedStrong = topicRows.filter((t) => t.attempts > 0)
    .map((t) => ({ ...t, priority: (t.accuracy * Math.log(t.attempts + 1)) }))
    .sort((a, b) => b.priority - a.priority).slice(0, 3);
  const breadth = Math.min(100, topicRows.filter((t) => t.attempts > 0).length * 12);
  const readiness = Math.max(0, Math.min(100,
    Number((exam.accuracy * 0.7 + Math.min(100, exam.bestStreak * 4) * 0.2 + breadth * 0.1).toFixed(1))
  ));
  const level = exam.attempts < 20 || readiness < 55 ? "Beginner"
    : readiness < 75 ? "Developing" : readiness < 88 ? "Strong" : "Exam Ready";
  return {
    level, readiness,
    weakAreas: rankedWeak, strongAreas: rankedStrong,
    recommendations: rankedWeak.length
      ? rankedWeak.map((t) => ({ topic: t.label, action: "Do 15 focused questions, review the core concept, then retest tomorrow." }))
      : [{ topic: "Mixed Revision", action: "Keep doing mixed sets to maintain retention and accuracy." }]
  };
}

function buildProfileResponse(profile, examName) {
  const examId = examIdFromName(examName);
  const exam = examId ? profile.exams[examId] : null;
  
  // Get summary of all exams for this student
  const examSummary = Object.entries(profile.exams || {}).map(([id, ex]) => ({
    id,
    name: ex.name || id,
    attempts: ex.attempts || 0,
    accuracy: ex.accuracy || 0,
    bestStreak: ex.bestStreak || 0,
    mockCount: (ex.mockHistory || []).length
  }));
  
  return {
    profile,
    currentExam: exam,
    training: exam ? computeTraining(exam) : null,
    examSummary,
    storageMode: hasFirebase() ? "firebase-firestore" : "memory-fallback"
  };
}

module.exports = {
  isAuthorized, getCode, normalizeLearnerName,
  getStoredProfile, saveStoredProfile,
  createEmptyProfile, applyTrackEvent, applyMockResult,
  buildProfileResponse
};
