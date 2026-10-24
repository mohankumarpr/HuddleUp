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

// Three related additions: spectators can see each team's actual roster (not just purses), a
// bidder gets the same "Sold!" share card the organizer sees the moment their own team wins a
// player, and a bidder can download (or share) their roster at any point.
test("spectator sees team rosters, a buying team gets a share card, and can download its roster", async ({
  page,
  browser,
}) => {
  const suffix = uniqueSuffix();
  const email = `organizer-${suffix}@example.com`;
  const password = "Passw0rd!123";
  const orgName = `Test Org ${suffix}`;
  const eventName = `Roster Sharing Night ${suffix}`;
  const teamAName = `Royals ${suffix}`;
  const playerName = `Casey Player ${suffix}`;
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

  // A spectator, in a third independent context, watches throughout.
  const spectatorContext = await browser.newContext();
  const spectatorPage = await spectatorContext.newPage();

  const repContext = await browser.newContext();
  const repPage = await repContext.newPage();
  try {
    await spectatorPage.goto(`/e/${slug}/watch`);
    await expect(spectatorPage.getByText(eventName, { exact: true })).toBeVisible({ timeout: 15000 });

    await repPage.goto(`/e/${slug}/join?code=${joinCode}&team=${teamA.id}&pin=${teamA.joinPin}`);
    await repPage.getByLabel(/Your name/i).fill("Team Rep");
    await repPage.getByRole("button", { name: /^Join and bid$/i }).click();
    await expect(repPage).toHaveURL(new RegExp(`/e/${slug}/bid$`), { timeout: 15000 });
    await repPage.getByRole("button", { name: /^Bid \d+$/ }).click();
    await expect(repPage.getByRole("button", { name: /^You're leading$/i })).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: new RegExp(`^Confirm SOLD to ${teamAName}$`) }).click();
    await expect(page.getByText("On the block", { exact: true })).toBeHidden({ timeout: 15000 });

    // The buying team's own rep gets the same "Sold!" share card the organizer sees, automatically.
    const myShareDialog = repPage.getByRole("dialog").filter({ hasText: "Share this sale" });
    await expect(myShareDialog).toBeVisible({ timeout: 15000 });
    await expect(myShareDialog.getByText(playerName, { exact: false })).toBeVisible();
    await myShareDialog.getByRole("button", { name: "Close" }).click();
    await expect(myShareDialog).toBeHidden();

    // The spectator can tap Team A's card to see who they've actually bought.
    await spectatorPage.getByText(teamAName, { exact: false }).first().click();
    const rosterDialog = spectatorPage.getByRole("dialog");
    await expect(rosterDialog).toBeVisible({ timeout: 15000 });
    await expect(rosterDialog.getByText(playerName, { exact: false })).toBeVisible();
    await rosterDialog.getByRole("button", { name: "Close" }).click();

    // The buying rep can download their own roster.
    await repPage.getByRole("button", { name: /^My roster \(1\)$/i }).click();
    const [download] = await Promise.all([
      repPage.waitForEvent("download"),
      repPage.getByRole("button", { name: /^Download$/i }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(`${teamAName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-roster.csv`);
  } finally {
    await repContext.close();
    await spectatorContext.close();
  }
});
