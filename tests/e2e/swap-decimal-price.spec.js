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
const { listDocuments, fieldValue } = require("./utils/firestoreRest");

// Regression test for a reported bug: the swap dialog's "Price you're offering" field used to be a
// plain rupee number box, so typing "1.25" meaning "1.25 crore" was read as 1.25 *rupees* and
// rounded down to a meaningless 1 -- the swap price "took the round-off value" instead of the
// crore amount actually meant. It's now an AmountField (see AmountField.jsx) with a unit picker.
test("a swap offer entered in crore with a decimal is stored as the exact rupee amount, not rounded off", async ({
  page,
  browser,
}) => {
  const suffix = uniqueSuffix();
  const email = `organizer-${suffix}@example.com`;
  const password = "Passw0rd!123";
  const orgName = `Test Org ${suffix}`;
  const eventName = `Swap Decimal Night ${suffix}`;
  const teamAName = `Royals ${suffix}`;
  const teamBName = `Giants ${suffix}`;
  const playerName = `Casey Player ${suffix}`;
  const basePrice = 100;
  const expectedBid = basePrice; // the first bid on a player opens right at the base price
  const teamPurse = 500000000; // 5 crore -- comfortably covers a 1.25 crore swap offer

  await signUpOrganizer(page, { displayName: "Morgan Organizer", orgName, email, password });
  const eventId = await createEvent(page, { name: eventName, purseDefault: teamPurse });
  await addTeam(page, eventId, { name: teamAName, purseTotal: teamPurse });
  await addTeam(page, eventId, { name: teamBName, purseTotal: teamPurse });

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
  const teamB = await getTeamByName(eventId, teamBName);

  // Team A buys the only player, so Team B has someone to offer a swap for.
  const repAContext = await browser.newContext();
  const repAPage = await repAContext.newPage();
  try {
    await repAPage.goto(`/e/${slug}/join?code=${joinCode}&team=${teamA.id}&pin=${teamA.joinPin}`);
    await repAPage.getByLabel(/Your name/i).fill("Rep A");
    await repAPage.getByRole("button", { name: /^Join and bid$/i }).click();
    await expect(repAPage).toHaveURL(new RegExp(`/e/${slug}/bid$`), { timeout: 15000 });
    await repAPage.getByRole("button", { name: new RegExp(`^Bid ${expectedBid}$`) }).click();
    await expect(repAPage.getByRole("button", { name: /^You're leading$/i })).toBeVisible({ timeout: 15000 });
  } finally {
    await repAContext.close();
  }

  await page.getByRole("button", { name: new RegExp(`^Confirm SOLD to ${teamAName}$`) }).click();
  await expect(page.getByRole("heading", { name: playerName })).toBeHidden({ timeout: 15000 });

  // Team B offers 1.25 crore for the player Team A just bought -- typed as "1.25" with the unit
  // picker on Crore, not as the raw rupee figure.
  const repBContext = await browser.newContext();
  const repBPage = await repBContext.newPage();
  try {
    await repBPage.goto(`/e/${slug}/join?code=${joinCode}&team=${teamB.id}&pin=${teamB.joinPin}`);
    await repBPage.getByLabel(/Your name/i).fill("Rep B");
    await repBPage.getByRole("button", { name: /^Join and bid$/i }).click();
    await expect(repBPage).toHaveURL(new RegExp(`/e/${slug}/bid$`), { timeout: 15000 });

    await repBPage.getByRole("button", { name: /^Swap a player$/i }).click();
    const dialog = repBPage.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Player").click();
    await repBPage.getByRole("option", { name: new RegExp(`^${playerName}`) }).click();

    await dialog.getByLabel(/^Unit$/i).click();
    await repBPage.getByRole("option", { name: "Crore" }).click();
    await dialog.getByLabel(/^Price you're offering$/i).fill("1.25");
    await dialog.getByRole("button", { name: /^Send offer$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 15000 });

    await expect(repBPage.getByText("1.25 crore", { exact: false })).toBeVisible({ timeout: 15000 });
  } finally {
    await repBContext.close();
  }

  const swapDocs = await listDocuments(`events/${eventId}/swapRequests`);
  const offer = swapDocs.find((d) => fieldValue(d, "requesterTeamId") === teamB.id);
  expect(offer, "Team B's swap offer should exist in Firestore").toBeTruthy();
  expect(fieldValue(offer, "price")).toBe(12500000);
});
