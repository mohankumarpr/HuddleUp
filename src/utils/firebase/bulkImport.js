import Papa from "papaparse";
import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "./config";
import { createSport } from "./events";
import { buildPlayerDocs } from "./players";

export const TEMPLATE_HEADERS = ["name", "email", "contact", "gender", "block", "about_me", "sports", "base_price", "photo_url"];

// Header names people actually use in spreadsheets / Google Forms, normalized (lowercase, letters
// and digits only) and mapped onto our fields.
const HEADER_ALIASES = {
  name: ["name", "playername", "fullname", "player", "participantname"],
  email: ["email", "emailid", "emailaddress", "mail"],
  contact: ["contact", "contactnumber", "phone", "phonenumber", "mobile", "mobilenumber", "whatsapp", "whatsappnumber"],
  gender: ["gender", "sex"],
  block: ["block", "flat", "blockflat", "flatno", "flatnumber", "apartment", "unit", "address"],
  aboutMe: ["aboutme", "about", "bio", "notes", "description"],
  sports: ["sports", "sport", "sportsinterested", "interestedsports", "games"],
  basePrice: ["baseprice", "price", "startingprice", "base"],
  photoUrl: ["photourl", "photo", "image", "imageurl", "picture", "photolink"],
};

const TRUTHY = new Set(["1", "yes", "y", "true", "x", "✓", "✔"]);

export function normalizeKey(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fieldForHeader(header) {
  const key = normalizeKey(header);
  return Object.keys(HEADER_ALIASES).find((field) => HEADER_ALIASES[field].includes(key)) || null;
}

function normalizeGender(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return { value: "" };
  if (["m", "male", "man", "boy"].includes(v)) return { value: "male" };
  if (["f", "female", "woman", "girl"].includes(v)) return { value: "female" };
  if (["other", "o", "non-binary", "nonbinary", "nb"].includes(v)) return { value: "other" };
  return { value: "", warning: `Unrecognized gender "${value}" (left blank)` };
}

export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (result) => resolve({ rows: result.data, headers: result.meta.fields || [] }),
      error: reject,
    });
  });
}

// Pure. Turns raw parsed rows into validated import rows.
//   sports:            [{id, name}] already configured for the event
//   existingIdentity:  Set of identity keys for players already in the event (see identityKey)
export function identityKey({ email, name, contact }) {
  const e = String(email || "").trim().toLowerCase();
  if (e) return `e:${e}`;
  return `n:${normalizeKey(name)}|${normalizeKey(contact)}`;
}

export function buildImportRows(rawRows, headers, { sports, existingIdentity, defaultBasePrice }) {
  const sportByName = new Map(sports.map((s) => [normalizeKey(s.name), s]));
  const headerField = new Map(headers.map((h) => [h, fieldForHeader(h)]));
  // Any header that isn't a known field but matches a sport's name is treated as a yes/no column,
  // which is how the old Google Form exported "Want to participate in <sport>".
  const sportFlagHeaders = headers.filter((h) => !headerField.get(h) && sportByName.has(normalizeKey(h)));

  const seen = new Set();

  return rawRows.map((raw, i) => {
    const errors = [];
    const warnings = [];
    const get = (field) => {
      const header = headers.find((h) => headerField.get(h) === field);
      return header ? String(raw[header] ?? "").trim() : "";
    };

    const name = get("name");
    const email = get("email");
    const contact = get("contact");
    const block = get("block");
    const aboutMe = get("aboutMe");
    const photoUrl = get("photoUrl");
    const genderResult = normalizeGender(get("gender"));
    if (genderResult.warning) warnings.push(genderResult.warning);

    if (!name) errors.push("Name is missing");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`"${email}" is not a valid email`);
    if (!email) warnings.push("No email -- this player won't be able to log in");

    let basePrice = defaultBasePrice;
    const rawPrice = get("basePrice");
    if (rawPrice) {
      const n = Number(rawPrice.replace(/[^0-9.]/g, ""));
      if (Number.isFinite(n) && n >= 0) basePrice = n;
      else warnings.push(`Base price "${rawPrice}" isn't a number (using default)`);
    }

    const sportIds = new Set();
    const unknownSports = [];
    get("sports")
      .split(/[,;|\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((sportName) => {
        const match = sportByName.get(normalizeKey(sportName));
        if (match) sportIds.add(match.id);
        else unknownSports.push(sportName);
      });
    sportFlagHeaders.forEach((h) => {
      if (TRUTHY.has(String(raw[h] ?? "").trim().toLowerCase())) sportIds.add(sportByName.get(normalizeKey(h)).id);
    });
    if (unknownSports.length) warnings.push(`Unknown sport(s): ${unknownSports.join(", ")}`);

    const key = identityKey({ email, name, contact });
    if (name) {
      if (existingIdentity.has(key)) errors.push("Already in this event's player list");
      else if (seen.has(key)) errors.push("Duplicate of an earlier row in this file");
      seen.add(key);
    }

    return {
      rowNumber: i + 2, // +2: 1-based, plus the header row
      data: { name, email, contact, block, aboutMe, photoUrl, gender: genderResult.value, basePrice, sportIds: [...sportIds] },
      unknownSports,
      errors,
      warnings,
    };
  });
}

export function templateCsv(sportNames = []) {
  const example = [
    "Priya Sharma",
    "priya@example.com",
    "9876543210",
    "female",
    "B-204",
    "Loves badminton",
    sportNames.slice(0, 2).join(";") || "Cricket;Badminton",
    "100",
    "",
  ];
  return `${TEMPLATE_HEADERS.join(",")}\n${example.map((v) => `"${v}"`).join(",")}\n`;
}

// Writes players in batches. Each player is two documents (public + private), and a Firestore
// batch holds at most 500 writes, so 200 players per batch is comfortably inside the limit.
export async function importPlayers(eventId, rows, { sports, createMissingSports, onProgress }) {
  const sportIdByName = new Map(sports.map((s) => [normalizeKey(s.name), s.id]));

  if (createMissingSports) {
    const missing = new Map();
    rows.forEach((r) => r.unknownSports.forEach((n) => missing.set(normalizeKey(n), n)));
    for (const [key, displayName] of missing) {
      if (!sportIdByName.has(key)) {
        // eslint-disable-next-line no-await-in-loop
        const id = await createSport(eventId, { name: displayName });
        sportIdByName.set(key, id);
      }
    }
  }

  const BATCH_SIZE = 200;
  let done = 0;
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = writeBatch(db);
    rows.slice(start, start + BATCH_SIZE).forEach((row) => {
      const sportIds = new Set(row.data.sportIds);
      if (createMissingSports) {
        row.unknownSports.forEach((n) => {
          const id = sportIdByName.get(normalizeKey(n));
          if (id) sportIds.add(id);
        });
      }
      const playerRef = doc(collection(db, "events", eventId, "players"));
      const { player, playerPrivate } = buildPlayerDocs({ ...row.data, sportIds: [...sportIds], source: "bulk" });
      batch.set(playerRef, player);
      batch.set(doc(db, "events", eventId, "playerPrivate", playerRef.id), playerPrivate);
    });
    // eslint-disable-next-line no-await-in-loop
    await batch.commit();
    done = Math.min(start + BATCH_SIZE, rows.length);
    if (onProgress) onProgress(done, rows.length);
  }
  return done;
}
