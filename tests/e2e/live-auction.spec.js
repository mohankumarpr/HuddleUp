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

// The core feature of the whole app: organizer runs the live auction, a team rep joins from a
// separate device/session and bids, the organizer confirms the sale, and money + player status
// move accordingly. Two independent Playwright browser contexts stand in for "two devices".
test("organizer runs an auction, a team rep bids, the sale is confirmed, and the purse updates", async ({
  page,
  browser,
}) => {
  const suffix = uniqueSuffix();
  const email = `organizer-${suffix}@example.com`;
  const password = "Passw0rd!123";
  const orgName = `Test Org ${suffix}`;
  const eventName = `Auction Night ${suffix}`;
  const teamAName = `Royals ${suffix}`;
  const teamBName = `Giants ${suffix}`;
  const playerName = `Casey Player ${suffix}`;
  const basePrice = 100;
  const expectedBid = 150; // nextIncrement(100, DEFAULT_LADDER) -> first rung (<1000) increment 50

  await signUpOrganizer(page, { displayName: "Morgan Organizer", orgName, email, password });
  const eventId = await createEvent(page, { name: eventName, purseDefault: 10000 });
  await addTeam(page, eventId, { name: teamAName, purseTotal: 10000 });
  await addTeam(page, eventId, { name: teamBName, purseTotal: 10000 });

  // Add one player straight into the pool via the organizer's CSV bulk upload (the
  // registration -> approval path to populate the pool is already covered by
  // registration-and-approval.spec.js, so this test can stay focused on the auction itself).
  await page.goto(`/app/events/${eventId}/import`);
  const csv = `name,base_price\n${playerName},${basePrice}\n`;
  await page.locator('[data-testid="csv-input"]').setInputFiles({
    name: "players.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(page.getByText(`${playerName}`, { exact: false })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /^Import 1 player$/i }).click();
  await expect(page.getByText(/^Imported 1 player/, { exact: false })).toBeVisible({ timeout: 15000 });

  // Start the live auction console and put the only pool player on the block.
  await page.goto(`/app/events/${eventId}/console`);
  await page.getByRole("button", { name: /^Start auction$/i }).click();
  await expect(page.getByText(/^live$/i)).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /^Pick random player$/i }).click();
  await expect(page.getByText("On the block", { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("heading", { name: playerName })).toBeVisible();

  // Fetch the join link details for team A (join code + team id + PIN) from Firestore directly --
  // equivalent to what scanning that team's join QR code (see TeamManager) would hand a rep, and
  // avoids driving the plain MUI <Select> team picker, which has no accessible name of its own.
  const slug = await getEventSlug(eventId);
  const joinCode = await getEventJoinCode(eventId);
  const teamA = await getTeamByName(eventId, teamAName);
  expect(teamA.purseRemaining).toBe(10000);

  const repContext = await browser.newContext();
  const repPage = await repContext.newPage();
  try {
    await repPage.goto(`/e/${slug}/join?code=${joinCode}&team=${teamA.id}&pin=${teamA.joinPin}`);
    await expect(repPage.getByLabel(/Your name/i)).toBeVisible({ timeout: 15000 });
    await repPage.getByLabel(/Your name/i).fill("Team Rep");
    await repPage.getByRole("button", { name: /^Join and bid$/i }).click();

    await expect(repPage).toHaveURL(new RegExp(`/e/${slug}/bid$`), { timeout: 15000 });
    await expect(repPage.getByRole("heading", { name: playerName })).toBeVisible({ timeout: 15000 });

    const bidButton = repPage.getByRole("button", { name: new RegExp(`^Bid ${expectedBid}$`) });
    await expect(bidButton).toBeVisible({ timeout: 15000 });
    await bidButton.click();

    await expect(repPage.getByRole("button", { name: /^You're leading$/i })).toBeVisible({ timeout: 15000 });
  } finally {
    await repContext.close();
  }

  // Back on the organizer console: the bid is reflected in real time.
  await expect(page.getByText(`${teamAName} leading`, { exact: false })).toBeVisible({ timeout: 15000 });
  const confirmButton = page.getByRole("button", { name: new RegExp(`^Confirm SOLD to ${teamAName}$`) });
  await expect(confirmButton).toBeVisible({ timeout: 15000 });
  await confirmButton.click();

  // The block clears (confirmSold resets currentPlayerId) and the auction waits for the next pick.
  await expect(page.getByText("Waiting for the next player", { exact: false })).toBeVisible({ timeout: 15000 });

  // The player pool shows the player as sold to team A for the bid price.
  await page.goto(`/app/events/${eventId}/players`);
  await expect(page.getByText(playerName, { exact: false })).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByText(`Sold to ${teamAName} for ${expectedBid}`, { exact: false })
  ).toBeVisible({ timeout: 15000 });

  // And team A's purse is reduced by exactly the sale price (verified both in the UI and in
  // Firestore directly, since the deduction happens inside a transaction).
  await page.goto(`/app/events/${eventId}/teams`);
  const teamARow = page.locator("div", { has: page.getByText(teamAName, { exact: true }) }).last();
  await expect(teamARow.getByText(new RegExp(`Purse\\s+${10000 - expectedBid}\\s*/\\s*10000`))).toBeVisible({
    timeout: 15000,
  });

  const teamAAfter = await getTeamByName(eventId, teamAName);
  expect(teamAAfter.purseRemaining).toBe(10000 - expectedBid);
});
