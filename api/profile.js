const {
  isAuthorized, getCode,
  getStoredProfile, saveStoredProfile,
  normalizeLearnerName, createEmptyProfile,
  applyTrackEvent, applyMockResult, buildProfileResponse
} = require("./_memory");

function normalizeExamName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function normalizeEvent(event) {
  if (!event || typeof event !== "object") return null;
  return {
    t: String(event.t || "").trim().slice(0, 60),
    d: String(event.d || "").trim().toLowerCase().slice(0, 32),
    ok: Boolean(event.ok),
    sc: Number(event.sc || 0),
    l: String(event.l || "Training event").trim().slice(0, 80),
    det: String(event.det || "").trim().slice(0, 180)
  };
}

async function loadProfile(accessCode, learnerName) {
  return (await getStoredProfile(accessCode, learnerName)) || createEmptyProfile(learnerName);
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const learnerName = normalizeLearnerName(req.body?.learnerName);
  if (!learnerName) {
    return res.status(400).json({ error: "Learner name is required" });
  }

  const accessCode = getCode(req);
  const action = String(req.body?.action || "load").trim();
  const examName = normalizeExamName(req.body?.examName);

  try {
    const profile = await loadProfile(accessCode, learnerName);
    profile.learnerName = learnerName;

    // Handle multiple exams selection
    if (action === "saveExams") {
      const exams = req.body?.exams;
      if (Array.isArray(exams)) {
        profile.selectedExams = exams.slice(0, 3).map(e => normalizeExamName(e));
      }
      profile.lastExamName = examName || profile.selectedExams[0] || "";
      await saveStoredProfile(accessCode, learnerName, profile);
      return res.status(200).json(buildProfileResponse(profile, profile.lastExamName));
    }

    if (action === "trackBatch") {
      const events = Array.isArray(req.body?.events)
        ? req.body.events.map(normalizeEvent).filter(Boolean) : [];
      const activeExam = examName || normalizeExamName(profile.lastExamName);

      if (!activeExam) {
        return res.status(400).json({ error: "Exam name is required for training events" });
      }

      for (const event of events.slice(0, 80)) {
        applyTrackEvent(profile, activeExam, event);
      }

      profile.lastExamName = activeExam;
      await saveStoredProfile(accessCode, learnerName, profile);
      return res.status(200).json(buildProfileResponse(profile, activeExam));
    }

    if (action === "trackMock") {
      const activeExam = examName || normalizeExamName(profile.lastExamName);
      if (!activeExam) {
        return res.status(400).json({ error: "Exam name is required" });
      }

      const mockResult = req.body?.mockResult;
      if (mockResult && typeof mockResult === "object") {
        applyMockResult(profile, activeExam, {
          title: String(mockResult.title || activeExam).slice(0, 100),
          score: Number(mockResult.score || 0),
          accuracy: Number(mockResult.accuracy || 0),
          correct: Number(mockResult.correct || 0),
          wrong: Number(mockResult.wrong || 0),
          unattempted: Number(mockResult.unattempted || 0),
          sections: Array.isArray(mockResult.sections) ? mockResult.sections.slice(0, 10) : []
        });
      }

      // Also apply individual question events if provided
      const events = Array.isArray(req.body?.events)
        ? req.body.events.map(normalizeEvent).filter(Boolean) : [];
      for (const event of events.slice(0, 120)) {
        applyTrackEvent(profile, activeExam, event);
      }

      profile.lastExamName = activeExam;
      await saveStoredProfile(accessCode, learnerName, profile);
      return res.status(200).json(buildProfileResponse(profile, activeExam));
    }

    if (action !== "load") {
      return res.status(400).json({ error: "Unknown profile action" });
    }

    if (examName) {
      profile.lastExamName = examName;
      await saveStoredProfile(accessCode, learnerName, profile);
    }

    return res.status(200).json(
      buildProfileResponse(profile, examName || normalizeExamName(profile.lastExamName))
    );
  } catch (error) {
    console.error("Profile handler error:", error);
    return res.status(500).json({ error: "Profile memory request failed" });
  }
}

module.exports = handler;
