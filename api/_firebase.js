// Firebase Firestore REST API helper — no SDK needed, works in Vercel serverless

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "zavprep";
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || "";
const PRIVATE_KEY = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// In-memory token cache (reused across warm invocations)
let _tokenCache = null;

function base64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function signJwt(header, payload, privateKey) {
  const crypto = require("crypto");
  const data = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(payload));
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(data);
  const sig = sign.sign(privateKey, "base64url");
  return data + "." + sig;
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_tokenCache && _tokenCache.exp > now + 60) return _tokenCache.token;

  const jwt = signJwt(
    { alg: "RS256", typ: "JWT" },
    {
      iss: CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now
    },
    PRIVATE_KEY
  );

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });

  const data = await res.json();
  if (!data.access_token) throw new Error("Firebase auth failed: " + JSON.stringify(data));
  _tokenCache = { token: data.access_token, exp: now + 3600 };
  return data.access_token;
}

function toFirestore(obj) {
  if (obj === null || obj === undefined) return { nullValue: null };
  if (typeof obj === "boolean") return { booleanValue: obj };
  if (typeof obj === "number") return Number.isInteger(obj) ? { integerValue: String(obj) } : { doubleValue: obj };
  if (typeof obj === "string") return { stringValue: obj };
  if (Array.isArray(obj)) return { arrayValue: { values: obj.map(toFirestore) } };
  if (typeof obj === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(obj)) fields[k] = toFirestore(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(obj) };
}

function fromFirestore(val) {
  if (!val) return null;
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return val.doubleValue;
  if ("stringValue" in val) return val.stringValue;
  if ("arrayValue" in val) return (val.arrayValue.values || []).map(fromFirestore);
  if ("mapValue" in val) {
    const out = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) out[k] = fromFirestore(v);
    return out;
  }
  return null;
}

function docToObject(doc) {
  if (!doc || !doc.fields) return null;
  const out = {};
  for (const [k, v] of Object.entries(doc.fields)) out[k] = fromFirestore(v);
  return out;
}

async function firestoreGet(collection, docId) {
  const token = await getAccessToken();
  const url = `${FIRESTORE_URL}/${collection}/${encodeURIComponent(docId)}`;
  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + token }
  });
  if (res.status === 404) return null;
  const data = await res.json();
  if (data.error) return null;
  return docToObject(data);
}

async function firestoreSet(collection, docId, obj) {
  const token = await getAccessToken();
  const url = `${FIRESTORE_URL}/${collection}/${encodeURIComponent(docId)}`;
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestore(v);
  const res = await fetch(url + "?currentDocument.exists=false&alt=json", {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fields })
  });
  // Ignore exists error - just patch regardless
  if (!res.ok) {
    const res2 = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fields })
    });
    if (!res2.ok) {
      const err = await res2.json().catch(() => ({}));
      throw new Error("Firestore write failed: " + JSON.stringify(err));
    }
  }
}

async function firestoreList(collection, limit = 200) {
  const token = await getAccessToken();
  const url = `${FIRESTORE_URL}/${collection}?pageSize=${limit}`;
  const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  const data = await res.json();
  if (!data.documents) return [];
  return data.documents.map(docToObject).filter(Boolean);
}

async function firestoreIncrement(collection, docId, field) {
  const existing = await firestoreGet(collection, docId) || {};
  existing[field] = (existing[field] || 0) + 1;
  existing.updatedAt = new Date().toISOString();
  await firestoreSet(collection, docId, existing);
  return existing[field];
}

module.exports = {
  firestoreGet,
  firestoreSet,
  firestoreList,
  firestoreIncrement
};
