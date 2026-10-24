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

// The bidder's "Sold players" list used to be one flat list of every sold player with the team
// name tucked into each row's secondary text -- hard to scan for "who has who" once more than a
// few players are sold. It's now grouped under a header per team.
test("a bidder's sold-players list is grouped by team, not one flat list", async ({ page, browser }) => {
  const suffix = uniqueSuffix();
  const email = `organizer-${suffix}@example.com`;
  const password = "Passw0rd!123";
  const orgName = `Test Org ${suffix}`;
  const eventName = `Grouped Sold Night ${suffix}`;
  const teamAName = `Royals ${suffix}`;
  const teamBName = `Giants ${suffix}`;
  const playerAName = `Casey Player ${suffix}`;
  const playerBName = `Drew Player ${suffix}`;
  const basePrice = 100;
  const teamPurse = 10000;

  await signUpOrganizer(page, { displayName: "Morgan Organizer", orgName, email, password });
  const eventId = await createEvent(page, { name: eventName, purseDefault: teamPurse });
  await addTeam(page, eventId, { name: teamAName, purseTotal: teamPurse });
  await addTeam(page, eventId, { name: teamBName, purseTotal: teamPurse });

  await page.goto(`/app/events/${eventId}/import`);
  const csv = `name,base_price\n${playerAName},${basePrice}\n${playerBName},${basePrice}\n`;
  await page.locator('[data-testid="csv-input"]').setInputFiles({
    name: "players.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(page.getByText(playerAName, { exact: false })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /^Import 2 players$/i }).click();
  await expect(page.getByText(/^Imported 2 players/, { exact: false })).toBeVisible({ timeout: 15000 });

  await page.goto(`/app/events/${eventId}/console`);
  await page.getByRole("button", { name: /^Start auction$/i }).click();
  await expect(page.getByText(/^live$/i)).toBeVisible({ timeout: 15000 });

  const slug = await getEventSlug(eventId);
  const joinCode = await getEventJoinCode(eventId);
  const teamA = await getTeamByName(eventId, teamAName);
  const teamB = await getTeamByName(eventId, teamBName);

  // A separate browser context per team -- one anonymous login can only ever be a rep for one
  // team in a given event (see teamReps/{uid}), so reusing one context for both teams would just
  // re-show whichever team it joined first.
  const repAContext = await browser.newContext();
  const repBContext = await browser.newContext();
  const repAPage = await repAContext.newPage();
  const repBPage = await repBContext.newPage();
  const soldPlayerFor = {}; // teamName -> whichever player "Pick random player" happened to choose
  try {
    for (const { teamName, team, repPage } of [
      { teamName: teamAName, team: teamA, repPage: repAPage },
      { teamName: teamBName, team: teamB, repPage: repBPage },
    ]) {
      await page.getByRole("button", { name: /^Pick random player$/i }).click();
      await expect(page.getByText("On the block", { exact: true })).toBeVisible({ timeout: 15000 });

      // "Pick random player" -- as the name says -- doesn't guarantee which of the two it lands
      // on, so note which one actually went on the block for this team.
      const gotPlayerA = await page.getByRole("heading", { name: playerAName }).isVisible();
      soldPlayerFor[teamName] = gotPlayerA ? playerAName : playerBName;

      await page.getByRole("button", { name: /^Start bidding$/i }).click();

      await repPage.goto(`/e/${slug}/join?code=${joinCode}&team=${team.id}&pin=${team.joinPin}`);
      await repPage.getByLabel(/Your name/i).fill(`${teamName} Rep`);
      await repPage.getByRole("button", { name: /^Join and bid$/i }).click();
      await expect(repPage).toHaveURL(new RegExp(`/e/${slug}/bid$`), { timeout: 15000 });
      await repPage.getByRole("button", { name: /^Bid \d+$/ }).click();
      await expect(repPage.getByRole("button", { name: /^You're leading$/i })).toBeVisible({ timeout: 15000 });

      await page.getByRole("button", { name: new RegExp(`^Confirm SOLD to ${teamName}$`) }).click();
      await expect(page.getByText("On the block", { exact: true })).toBeHidden({ timeout: 15000 });

      // Confirming a sale auto-opens a "Share this sale" dialog for the organizer, and the same
      // card for the buying team's own rep (see TeamBidderView.jsx) -- close both, or they block
      // the console/bidder screen behind them.
      await page.getByRole("button", { name: "Close" }).click();
      const repShareDialog = repPage.getByRole("dialog").filter({ hasText: "Share this sale" });
      await expect(repShareDialog).toBeVisible({ timeout: 15000 });
      await repShareDialog.getByRole("button", { name: "Close" }).click();
    }

    // From Team A's own bidding screen: both teams' purchases show up grouped under their own
    // team heading, not mixed into one list.
    await repAPage.getByRole("button", { name: /^Sold players \(2\)$/i }).click();
    await expect(repAPage.getByText(`${teamAName} (1)`, { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(repAPage.getByText(`${teamBName} (1)`, { exact: true })).toBeVisible();

    // Each team's own purchase appears in its own group, not the other team's.
    const royalsGroup = repAPage.getByTestId(`sold-group-${teamA.id}`);
    const giantsGroup = repAPage.getByTestId(`sold-group-${teamB.id}`);
    await expect(royalsGroup.getByText(soldPlayerFor[teamAName], { exact: false })).toBeVisible();
    await expect(giantsGroup.getByText(soldPlayerFor[teamBName], { exact: false })).toBeVisible();
    await expect(royalsGroup.getByText(soldPlayerFor[teamBName], { exact: false })).toBeHidden();
    await expect(giantsGroup.getByText(soldPlayerFor[teamAName], { exact: false })).toBeHidden();
  } finally {
    await repAContext.close();
    await repBContext.close();
  }
});
