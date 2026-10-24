const { test, expect } = require("@playwright/test");
const {
  uniqueSuffix,
  signUpOrganizer,
  createEvent,
  addTeam,
  getEventSlug,
  getEventJoinCode,
  getTeamByName,
} = require("./utils/helpers");
const { getDocument, fieldValue } = require("./utils/firestoreRest");

// Resetting each team's one-time swap/withdraw allowance individually (see live-auction.spec.js)
// doesn't scale once several teams have used theirs -- the Teams page also offers a single button
// that resets every team at once.
test("the organizer can reset swap & withdraw for every team in one click", async ({ page, browser }) => {
  const suffix = uniqueSuffix();
  const email = `organizer-${suffix}@example.com`;
  const password = "Passw0rd!123";
  const orgName = `Test Org ${suffix}`;
  const eventName = `Bulk Reset Night ${suffix}`;
  const teamAName = `Royals ${suffix}`;
  const teamBName = `Giants ${suffix}`;
  const playerName = `Taylor Player ${suffix}`;
  const basePrice = 100;

  await signUpOrganizer(page, { displayName: "Morgan Organizer", orgName, email, password });
  const eventId = await createEvent(page, { name: eventName, purseDefault: 10000 });
  await addTeam(page, eventId, { name: teamAName, purseTotal: 10000 });
  await addTeam(page, eventId, { name: teamBName, purseTotal: 10000 });

  await page.goto(`/app/events/${eventId}/import`);
  const csv = `name,base_price\n${playerName},${basePrice}\n`;
  await page.locator('[data-testid="csv-input"]').setInputFiles({
    name: "players.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(page.getByText(playerName, { exact: false })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /^Import 1 player$/i }).click();
  await expect(page.getByText(/^Imported 1 player/, { exact: false })).toBeVisible({ timeout: 15000 });

  await page.goto(`/app/events/${eventId}/console`);
  await page.getByRole("button", { name: /^Start auction$/i }).click();
  await expect(page.getByText(/^live$/i)).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /^Pick random player$/i }).click();
  await expect(page.getByText("On the block", { exact: true })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /^Start bidding$/i }).click();

  const slug = await getEventSlug(eventId);
  const joinCode = await getEventJoinCode(eventId);
  const teamA = await getTeamByName(eventId, teamAName);

  // Burn Team A's one-time bid withdrawal, the same way live-auction.spec.js does.
  const repContext = await browser.newContext();
  const repPage = await repContext.newPage();
  try {
    await repPage.goto(`/e/${slug}/join?code=${joinCode}&team=${teamA.id}&pin=${teamA.joinPin}`);
    await repPage.getByLabel(/Your name/i).fill("Team Rep");
    await repPage.getByRole("button", { name: /^Join and bid$/i }).click();
    await expect(repPage).toHaveURL(new RegExp(`/e/${slug}/bid$`), { timeout: 15000 });
    await repPage.getByRole("button", { name: /^Bid \d+$/ }).click();
    await expect(repPage.getByRole("button", { name: /^You're leading$/i })).toBeVisible({ timeout: 15000 });
    await repPage.getByRole("button", { name: /^Withdraw my bid \(one-time use\)$/i }).click();
    await repPage.getByRole("dialog").getByRole("button", { name: /^Withdraw bid$/i }).click();
    await expect(repPage.getByRole("button", { name: /^You're leading$/i })).toBeHidden({ timeout: 15000 });
  } finally {
    await repContext.close();
  }

  await expect
    .poll(async () => {
      const doc = await getDocument(`events/${eventId}/teams/${teamA.id}`);
      return fieldValue(doc, "bidWithdrawUsed");
    }, { timeout: 15000 })
    .toBe(true);

  // The bulk reset button only appears once at least one team has used something, resets every
  // team (Team B never used anything, so it's a no-op for them), and the chip disappears.
  await page.goto(`/app/events/${eventId}/teams`);
  await page.getByRole("button", { name: /^Reset swap & withdraw for all teams$/i }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^Reset for all teams$/i }).click();

  const teamACard = page.locator(".MuiPaper-root", { has: page.getByText(teamAName, { exact: true }) }).first();
  await expect(teamACard.getByText("Bid withdrawal used", { exact: true })).toBeHidden({ timeout: 15000 });
  await expect(page.getByRole("button", { name: /^Reset swap & withdraw for all teams$/i })).toBeHidden();

  await expect
    .poll(async () => {
      const doc = await getDocument(`events/${eventId}/teams/${teamA.id}`);
      return fieldValue(doc, "bidWithdrawUsed");
    }, { timeout: 15000 })
    .toBe(false);
});
