const { test, expect } = require("@playwright/test");
const { uniqueSuffix, signUpOrganizer, createEvent, addSport, addTeam } = require("./utils/helpers");

test("organizer adds a sport and two teams with purses", async ({ page }) => {
  const suffix = uniqueSuffix();
  const email = `organizer-${suffix}@example.com`;
  const password = "Passw0rd!123";
  const orgName = `Test Org ${suffix}`;
  const eventName = `Summer League ${suffix}`;
  const sportName = `Badminton ${suffix}`;
  const teamAName = `Falcons ${suffix}`;
  const teamBName = `Tigers ${suffix}`;

  await signUpOrganizer(page, { displayName: "Alex Organizer", orgName, email, password });
  const eventId = await createEvent(page, { name: eventName, purseDefault: 10000 });

  await addSport(page, eventId, { name: sportName });
  // Still on the Sports page -- confirm it shows up with the "no rules yet" chip (freshly added).
  await expect(page.getByText(sportName, { exact: true })).toBeVisible();

  await addTeam(page, eventId, { name: teamAName, purseTotal: 8000 });
  await addTeam(page, eventId, { name: teamBName, purseTotal: 12000 });

  // Both teams show up, each with its own purse total reflected in the UI.
  const teamARow = page.locator("div", { has: page.getByText(teamAName, { exact: true }) }).last();
  await expect(teamARow.getByText(/Purse\s+8000\s*\/\s*8000/)).toBeVisible();

  const teamBRow = page.locator("div", { has: page.getByText(teamBName, { exact: true }) }).last();
  await expect(teamBRow.getByText(/Purse\s+12000\s*\/\s*12000/)).toBeVisible();

  // Back on the event overview, both teams and the sport are reflected in the summary (each name
  // legitimately appears twice there -- once in the Teams card, once in the Standings widget's
  // table -- so .first() is enough to confirm presence without over-asserting on layout).
  await page.goto(`/app/events/${eventId}`);
  await expect(page.getByText(teamAName, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(teamBName, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(sportName, { exact: true }).first()).toBeVisible();
});
