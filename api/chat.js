const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "google/gemma-3-27b-it:free";
const rateState = globalThis.__zenprepRateState || (globalThis.__zenprepRateState = new Map());

function getAllowedCodes() {
  return String(process.env.APP_ACCESS_CODES || process.env.APP_ACCESS_CODE || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getCode(req) {
  return String(req.headers["x-access-code"] || req.body?.code || "").trim();
}

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  return forwarded || req.headers["x-real-ip"] || "unknown";
}

function isRateLimited(req, code) {
  const limit = Math.max(1, Number(process.env.APP_RATE_LIMIT_PER_HOUR || 80));
  const now = Date.now();
  const key = getClientIp(req) + ":" + (code || "public");
  const current = rateState.get(key);

  if (!current || current.resetAt <= now) {
    rateState.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return false;
  }

  if (current.count >= limit) {
    return true;
  }

  current.count += 1;
  return false;
}

function normalizeMode(value) {
  const mode = String(value || "auto").trim().toLowerCase();
  return mode === "claude" || mode === "gemma" ? mode : "auto";
}

function providerQueue(mode) {
  const providers = [];
  if (mode !== "gemma" && process.env.ANTHROPIC_API_KEY) {
    providers.push("claude");
  }
  if (mode !== "claude" && process.env.OPENROUTER_API_KEY) {
    providers.push("gemma");
  }
  return providers;
}

function getTextFromAnthropic(data) {
  const content = Array.isArray(data?.content) ? data.content : [];
  return content
    .filter((item) => item && item.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function getTextFromOpenRouter(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : item?.text || ""))
      .join("\n")
      .trim();
  }
  return "";
}

function upstreamError(status, message) {
  const error = new Error(message || "Proxy request failed");
  error.status = status || 502;
  return error;
}

async function callAnthropic({ system, user, maxTokens, temperature }) {
  const upstream = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      system,
      messages: [{ role: "user", content: user }],
      max_tokens: maxTokens,
      temperature
    })
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    throw upstreamError(
      upstream.status,
      data?.error?.message || data?.message || "Anthropic request failed"
    );
  }

  const text = getTextFromAnthropic(data);
  if (!text) {
    throw upstreamError(502, "Anthropic returned an empty response");
  }

  return { text, provider: "claude" };
}

async function callOpenRouter({ system, user, maxTokens, temperature }) {
  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.OPENROUTER_API_KEY,
      "X-Title": "ZenPrep AI",
      ...(process.env.APP_BASE_URL ? { "HTTP-Referer": process.env.APP_BASE_URL } : {})
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      max_tokens: maxTokens,
      temperature
    })
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    throw upstreamError(
      upstream.status,
      data?.error?.message || data?.message || "OpenRouter request failed"
    );
  }

  const text = getTextFromOpenRouter(data);
  if (!text) {
    throw upstreamError(502, "OpenRouter returned an empty response");
  }

  return { text, provider: "gemma" };
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const allowed = getAllowedCodes();
  const code = getCode(req);
  if (allowed.length && (!code || !allowed.includes(code))) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (isRateLimited(req, code)) {
    return res.status(429).json({ error: "Rate limit reached for this hour" });
  }

  const system = String(req.body?.system || "").trim();
  const user = String(req.body?.user || "").trim();
  const mode = normalizeMode(req.body?.mode);
  const maxTokens = Math.min(1600, Math.max(120, Number(req.body?.maxTokens || 900)));
  const temperature = Math.min(1, Math.max(0, Number(req.body?.temperature || 0.35)));

  if (!system || !user) {
    return res.status(400).json({ error: "Missing prompt content" });
  }

  const providers = providerQueue(mode);
  if (!providers.length) {
    return res.status(500).json({ error: "No AI provider is configured on the server" });
  }

  let lastError = null;
  for (const provider of providers) {
    try {
      const result =
        provider === "claude"
          ? await callAnthropic({ system, user, maxTokens, temperature })
          : await callOpenRouter({ system, user, maxTokens, temperature });

      return res.status(200).json({
        text: result.text,
        provider: result.provider,
        mode
      });
    } catch (error) {
      lastError = error;
    }
  }

  return res.status(lastError?.status || 502).json({
    error: lastError?.message || "Proxy request failed"
  });
}

module.exports = handler;
