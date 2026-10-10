// Thin helper around the Firestore emulator's REST API. Used only to *set up and verify* test
// data quickly (e.g. "what slug did createEvent() generate?", "what's this team's join PIN?") --
// never to replace the actual feature flows under test, which all still go through the real UI.
// Requires Node 18+'s built-in fetch (we're on Node 20).
const PROJECT_ID = "demo-test";
const BASE = `http://127.0.0.1:8081/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function fieldValue(doc, name) {
  const f = doc?.fields?.[name];
  if (!f) return undefined;
  if ("stringValue" in f) return f.stringValue;
  if ("integerValue" in f) return Number(f.integerValue);
  if ("doubleValue" in f) return Number(f.doubleValue);
  if ("booleanValue" in f) return f.booleanValue;
  if ("nullValue" in f) return null;
  return f;
}

function docId(doc) {
  return doc.name.split("/").pop();
}

async function getDocument(path) {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`Firestore REST GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function listDocuments(path) {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`Firestore REST LIST ${path} failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.documents || [];
}

// Polls a document until `fieldName` is present (handy right after a UI action that triggers an
// async Firestore write, instead of guessing a sleep duration).
async function waitForDocField(path, fieldName, { timeoutMs = 15000, intervalMs = 300 } = {}) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeoutMs) {
    try {
      const doc = await getDocument(path);
      const value = fieldValue(doc, fieldName);
      if (value !== undefined && value !== null) return value;
    } catch (err) {
      lastErr = err;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out waiting for ${path}.${fieldName}${lastErr ? ` (last error: ${lastErr.message})` : ""}`);
}

module.exports = { getDocument, listDocuments, fieldValue, docId, waitForDocField, PROJECT_ID, BASE };
