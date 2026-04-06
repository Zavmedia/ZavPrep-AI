// auth.js — Access code + password verification
// Also records daily active user count in Firebase

const { firestoreIncrement, firestoreGet, firestoreSet } = require("./_firebase");

function getAllowedCodes() {
  return String(process.env.APP_ACCESS_CODES || "Dream_100%")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getAppPassword() {
  return String(process.env.APP_PASSWORD || "Success@hardwork%").trim();
}

function getCode(req) {
  return String(req.headers["x-access-code"] || req.body?.code || "").trim();
}

function getPassword(req) {
  return String(req.body?.password || "").trim();
}

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function recordActivity(code) {
  try {
    const day = todayKey();
    await firestoreIncrement("stats", `dau_${day}`, "count");
    // Also record per-code activity
    const codeDoc = await firestoreGet("stats", `code_${code}`) || {};
    codeDoc.lastSeen = new Date().toISOString();
    codeDoc.totalLogins = (codeDoc.totalLogins || 0) + 1;
    codeDoc.code = code;
    await firestoreSet("stats", `code_${code}`, codeDoc);
  } catch (_) {
    // Non-blocking — don't fail auth if stats fail
  }
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const allowed = getAllowedCodes();
  const appPassword = getAppPassword();
  const code = getCode(req);
  const password = getPassword(req);
  const probe = Boolean(req.body?.probe);

  // If no codes configured at all, open access
  if (!allowed.length && !appPassword) {
    return res.status(200).json({ ok: true, required: false });
  }

  // Probe: just check if auth is required
  if (probe) {
    return res.status(200).json({
      ok: false,
      required: true,
      hasPassword: Boolean(appPassword),
      hasCodes: Boolean(allowed.length)
    });
  }

  // Validate access code
  if (allowed.length && (!code || !allowed.includes(code))) {
    return res.status(401).json({ error: "Invalid access code" });
  }

  // Validate password
  if (appPassword && password !== appPassword) {
    return res.status(401).json({ error: "Invalid password" });
  }

  // Success — record activity async (don't await, keep login fast)
  recordActivity(code).catch(() => {});

  return res.status(200).json({ ok: true, required: true });
}

module.exports = handler;
