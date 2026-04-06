// admin.js — Admin analytics panel API
// Protected by ADMIN_CODE env variable

const { firestoreList, firestoreGet } = require("./_firebase");

function getAdminCode() {
  return String(process.env.ADMIN_CODE || "").trim();
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

async function handler(req, res) {
  const adminCode = getAdminCode();

  // Support both GET (query param) and POST (body)
  const providedCode = String(
    req.query?.code || req.body?.code || req.headers["x-admin-code"] || ""
  ).trim();

  if (!adminCode) {
    return res.status(503).json({ error: "Admin panel not configured" });
  }

  if (!providedCode || providedCode !== adminCode) {
    return res.status(401).json({ error: "Invalid admin code" });
  }

  try {
    // Fetch all profile documents
    const profiles = await firestoreList("profiles", 500);

    // Fetch all stat documents
    const stats = await firestoreList("stats", 500);

    // Build DAU (daily active users) for last 14 days
    const days = lastNDays(14);
    const dauMap = {};
    for (const day of days) {
      const stat = stats.find((s) => s && Object.prototype.hasOwnProperty.call(s, "count") &&
        stats.indexOf(s) === stats.findIndex((x) => x === s));
      dauMap[day] = 0;
    }

    // Process stats documents for DAU
    for (const stat of stats) {
      if (!stat) continue;
      // Stat docs for DAU have key like dau_YYYY-MM-DD
      const dayKeys = days.filter((d) => stat.updatedAt && stat.updatedAt.startsWith(d));
      if (dayKeys.length && stat.count) {
        dauMap[dayKeys[0]] = Number(stat.count || 0);
      }
    }

    // Also fetch individual DAU docs directly
    const dauData = {};
    for (const day of days) {
      try {
        const doc = await firestoreGet("stats", `dau_${day}`);
        dauData[day] = doc ? Number(doc.count || 0) : 0;
      } catch (_) {
        dauData[day] = 0;
      }
    }

    // Exam usage counts
    const examCounts = {};
    let totalAttempts = 0;
    for (const profile of profiles) {
      if (!profile || !profile.exams) continue;
      for (const [examId, exam] of Object.entries(profile.exams)) {
        if (!exam) continue;
        const label = exam.name || examId;
        if (!examCounts[label]) examCounts[label] = { label, students: 0, attempts: 0 };
        examCounts[label].students += 1;
        examCounts[label].attempts += exam.attempts || 0;
        totalAttempts += exam.attempts || 0;
      }
    }

    const exams = Object.values(examCounts)
      .sort((a, b) => b.students - a.students);

    // Access code usage
    const codeStats = stats
      .filter((s) => s && s.code)
      .map((s) => ({
        code: s.code,
        totalLogins: s.totalLogins || 0,
        lastSeen: s.lastSeen || null
      }))
      .sort((a, b) => b.totalLogins - a.totalLogins);

    // Recent students
    const recentStudents = profiles
      .filter((p) => p && p.learnerName)
      .map((p) => ({
        name: p.learnerName,
        lastSeen: p.lastSeenAt || p.updatedAt || null,
        createdAt: p.createdAt || null,
        totalAttempts: p.overall ? p.overall.attempts : 0,
        accuracy: p.overall ? p.overall.accuracy : 0,
        examCount: p.exams ? Object.keys(p.exams).length : 0,
        lastExam: p.lastExamName || "",
        selectedExams: p.selectedExams || []
      }))
      .sort((a, b) => (b.lastSeen || "").localeCompare(a.lastSeen || ""))
      .slice(0, 50);

    return res.status(200).json({
      summary: {
        totalStudents: profiles.filter((p) => p && p.learnerName).length,
        totalAttempts,
        today: dauData[todayKey()] || 0,
        topExam: exams[0]?.label || "—"
      },
      dau: days.map((d) => ({ date: d, count: dauData[d] || 0 })),
      exams,
      codeStats,
      recentStudents
    });
  } catch (err) {
    return res.status(500).json({ error: "Admin fetch failed: " + err.message });
  }
}

module.exports = handler;
