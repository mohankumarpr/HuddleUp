import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "./config";

// Every subcollection that makes up one event, as named in firestore.rules. There is no admin
// export on the Spark/free plan (no Cloud Functions, no scheduled backups), so this is the only
// safety net an organizer has against an accidental delete or a bad bulk edit -- it reads
// everything the organizer's own browser can already see and bundles it into one downloadable file.
const SUBCOLLECTIONS = [
  "sports",
  "teams",
  "registrations",
  "players",
  "playerPrivate",
  "participants",
  "results",
  "fixtures",
  "teamReps",
  "bids",
];

async function dumpCollection(eventId, name) {
  const snap = await getDocs(collection(db, "events", eventId, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Firestore Timestamps survive getDocs() as {seconds, nanoseconds} objects, not plain JSON --
// JSON.stringify would silently drop their toJSON() behavior and leave a confusing shape. This
// coerces every Timestamp-like value to an ISO string so the exported file is just plain JSON.
function serializable(value) {
  if (value == null) return value;
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializable);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serializable(v)]));
  }
  return value;
}

export async function fetchEventBackup(eventId) {
  const eventSnap = await getDoc(doc(db, "events", eventId));
  const auctionStateSnap = await getDoc(doc(db, "events", eventId, "auction", "state"));

  const entries = await Promise.all(SUBCOLLECTIONS.map((name) => dumpCollection(eventId, name)));
  const data = {
    exportedAt: new Date().toISOString(),
    event: eventSnap.exists() ? { id: eventSnap.id, ...eventSnap.data() } : null,
    auctionState: auctionStateSnap.exists() ? auctionStateSnap.data() : null,
  };
  SUBCOLLECTIONS.forEach((name, i) => {
    data[name] = entries[i];
  });

  return serializable(data);
}

export async function downloadEventBackup(eventId, eventName) {
  const data = await fetchEventBackup(eventId);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const datePart = new Date().toISOString().slice(0, 10);
  const safeName = (eventName || eventId).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName}-backup-${datePart}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
