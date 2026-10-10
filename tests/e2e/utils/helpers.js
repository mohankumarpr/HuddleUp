const { expect } = require("@playwright/test");
const { getDocument, listDocuments, fieldValue, docId } = require("./firestoreRest");

// Each spec file generates its own unique organizer/org/event names (see brief) instead of
// relying on wiping the emulator between files -- simpler and avoids ordering/timing issues.
function uniqueSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 100000)}`;
}

// MUI appends a literal " *" to the accessible name of a required TextField's label, so an exact
// getByLabel("Full name") is brittle. This builds a tolerant matcher for required-field labels.
function reqLabel(text) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}\\s*\\*?\\s*$`, "i");
}

async function signUpOrganizer(page, { displayName, orgName, email, password }) {
  await page.goto("/signup");
  await page.getByLabel(reqLabel("Your name")).fill(displayName);
  await page.getByLabel(reqLabel("Organization name")).fill(orgName);
  await page.getByLabel(reqLabel("Email")).fill(email);
  await page.getByLabel(reqLabel("Password")).fill(password);
  await page.getByRole("button", { name: /Create account/i }).click();
  await expect(page).toHaveURL(/\/app\/events$/, { timeout: 20000 });
  // Sanity check: the dashboard actually reflects the new org, not a stale/failed sign-up. Both
  // the navbar's org menu and the event list's subtitle show the org name, so just check one.
  await expect(page.getByText(orgName, { exact: false }).first()).toBeVisible({ timeout: 15000 });
}

async function createEvent(page, { name, venue, purseDefault }) {
  await page.goto("/app/events");
  await page.getByRole("link", { name: /^New event$/i }).first().click();
  await expect(page).toHaveURL(/\/app\/events\/new$/);
  await page.getByLabel(reqLabel("Event name")).fill(name);
  if (venue) await page.getByLabel(/^Venue$/i).fill(venue);
  if (purseDefault != null) {
    const purseField = page.getByLabel(/Starting purse per team/i);
    await purseField.fill(String(purseDefault));
  }
  await page.getByRole("button", { name: /Create event/i }).click();
  await expect(page).toHaveURL(/\/app\/events\/[^/]+$/, { timeout: 20000 });
  await expect(page.getByRole("heading", { name })).toBeVisible({ timeout: 15000 });
  const match = page.url().match(/\/app\/events\/([^/?#]+)/);
  expect(match).toBeTruthy();
  return match[1];
}

async function addSport(page, eventId, { name }) {
  await page.goto(`/app/events/${eventId}/sports`);
  await page.getByRole("button", { name: /^Add sport$/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(reqLabel("Sport name")).fill(name);
  await dialog.getByRole("button", { name: /^Save$/i }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 15000 });
}

async function addTeam(page, eventId, { name, purseTotal }) {
  await page.goto(`/app/events/${eventId}/teams`);
  await page.getByRole("button", { name: /^Add team$/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(reqLabel("Team name")).fill(name);
  if (purseTotal != null) {
    await dialog.getByLabel(/Starting purse/i).fill(String(purseTotal));
  }
  await dialog.getByRole("button", { name: /^Save$/i }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 15000 });
}

async function getEventSlug(eventId) {
  const doc = await getDocument(`events/${eventId}`);
  const slug = fieldValue(doc, "slug");
  expect(slug).toBeTruthy();
  return slug;
}

async function getTeamByName(eventId, name) {
  const docs = await listDocuments(`events/${eventId}/teams`);
  const match = docs.find((d) => fieldValue(d, "name") === name);
  expect(match, `Team "${name}" should exist in Firestore for event ${eventId}`).toBeTruthy();
  return {
    id: docId(match),
    joinPin: fieldValue(match, "joinPin"),
    purseRemaining: fieldValue(match, "purseRemaining"),
    purseTotal: fieldValue(match, "purseTotal"),
  };
}

async function getEventJoinCode(eventId) {
  const doc = await getDocument(`events/${eventId}`);
  return fieldValue(doc, "joinCode");
}

module.exports = {
  uniqueSuffix,
  reqLabel,
  signUpOrganizer,
  createEvent,
  addSport,
  addTeam,
  getEventSlug,
  getTeamByName,
  getEventJoinCode,
};
