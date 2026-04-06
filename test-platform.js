const fs = require('fs');
const path = require('path');

// Manually parse .env
const env = {};
const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) {
    let value = val.join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[key] = value;
  }
});

// Mock process.env for the helpers
process.env = { ...process.env, ...env };

const { firestoreGet } = require('./api/_firebase');

async function test() {
  console.log("--- ZenPrep Platform Test ---");

  // 1. Check Credentials
  console.log(`\n[1] Checking Access: Codes=[${process.env.APP_ACCESS_CODES}] Pass=[${process.env.APP_PASSWORD}]`);
  
  // 2. Test Firebase
  console.log("\n[2] Testing Firebase Connection...");
  try {
    const profile = await firestoreGet("profiles", "test-connection-check");
    console.log("✓ Firebase REST API responds correctly.");
  } catch (e) {
    console.error("✗ Firebase Test Failed:", e.message);
  }

  // 3. Test AI Keys (Basic Format Check)
  console.log("\n[3] Checking AI Key Formats...");
  const orKey = process.env.OPENROUTER_API_KEY || "";
  const antKey = process.env.ANTHROPIC_API_KEY || "";
  
  if (orKey.startsWith("sk-or-v1-")) console.log("✓ OpenRouter key format is valid.");
  else console.error("✗ OpenRouter key seems invalid or missing.");

  if (antKey.startsWith("sk-ant-api03-")) console.log("✓ Anthropic key format is valid.");
  else console.error("✗ Anthropic key seems invalid or missing.");

  // 4. Live AI Test (Small request)
  console.log("\n[4] Testing OpenRouter Live (Gemma)...");
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + orKey
      },
      body: JSON.stringify({
        model: "google/gemma-3-27b-it:free",
        messages: [{role: "user", content: "hi"}],
        max_tokens: 5
      })
    });
    const data = await res.json();
    if (res.ok) console.log("✓ OpenRouter Live Test Success!");
    else {
      console.error("✗ OpenRouter Live Test Failed!");
      console.error("Error Status:", res.status);
      console.error("Error Detail:", JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error("✗ OpenRouter Fetch Failed:", e.message);
  }

  console.log("\n--- Test Complete ---");
}

test();
