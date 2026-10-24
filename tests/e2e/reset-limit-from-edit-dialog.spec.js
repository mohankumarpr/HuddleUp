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

// Besides the card's own "used" chip, the organizer can reset a team's one-time swap/withdraw
// allowance straight from that team's Edit dialog -- the "manage this team" screen -- and it
// updates live there without needing to close and reopen the dialog.
test("the organizer can reset a team's bid withdrawal from its Edit dialog", async ({ page, browser }) => {
  const suffix = uniqueSuffix();
  const email = `organizer-${suffix}@example.com`;
  const password = "Passw0rd!123";
  const orgName = `Test Org ${suffix}`;
  const eventName = `Edit Dialog Reset Night ${suffix}`;
  const teamAName = `Royals ${suffix}`;
  const playerName = `Taylor Player ${suffix}`;
  const basePrice = 100;

  await signUpOrganizer(page, { displayName: "Morgan Organizer", orgName, email, password });
  const eventId = await createEvent(page, { name: eventName, purseDefault: 10000 });
  await addTeam(page, eventId, { name: teamAName, purseTotal: 10000 });

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

  await page.goto(`/app/events/${eventId}/teams`);
  await page.getByRole("button", { name: `Edit ${teamAName}` }).click();

  const editDialog = page.getByRole("dialog");
  await expect(editDialog.getByText("One-time limits used", { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(editDialog.getByText("Bid withdrawal", { exact: true })).toBeVisible();

  await editDialog.getByRole("button", { name: /^Reset$/i }).click();
  // The in-dialog Reset button opens the same confirmation as the card's chip -- a second dialog
  // stacked on top of the Edit dialog.
  await page.getByRole("button", { name: /^Reset withdrawal$/i }).click();

  // Updates live, without the dialog needing to close and reopen.
  await expect(editDialog.getByText("Bid withdrawal", { exact: true })).toBeHidden({ timeout: 15000 });
  await expect(editDialog.getByText("One-time limits used", { exact: true })).toBeHidden();
  await editDialog.getByRole("button", { name: /^Cancel$/i }).click();

  await expect
    .poll(async () => {
      const doc = await getDocument(`events/${eventId}/teams/${teamA.id}`);
      return fieldValue(doc, "bidWithdrawUsed");
    }, { timeout: 15000 })
    .toBe(false);
});
