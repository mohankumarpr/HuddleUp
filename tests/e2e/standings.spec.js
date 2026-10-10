const { test, expect } = require("@playwright/test");
const { uniqueSuffix, signUpOrganizer, createEvent, addSport, addTeam } = require("./utils/helpers");

// Exercises the organizer's "set points by position" calculator (src/utils/positionPoints.js),
// including its tie-handling rule: two teams sharing 1st place split the sum of the 1st+2nd scale
// values between them, and the next team is still ranked 3rd.
test("organizer enters points by position, including a tie for first, and the leaderboard reflects it", async ({
  page,
}) => {
  const suffix = uniqueSuffix();
  const email = `organizer-${suffix}@example.com`;
  const password = "Passw0rd!123";
  const orgName = `Test Org ${suffix}`;
  const eventName = `Points Cup ${suffix}`;
  const sportName = `Athletics ${suffix}`;
  const teamAName = `Alpha ${suffix}`;
  const teamBName = `Bravo ${suffix}`;
  const teamCName = `Charlie ${suffix}`;

  await signUpOrganizer(page, { displayName: "Taylor Organizer", orgName, email, password });
  const eventId = await createEvent(page, { name: eventName, purseDefault: 5000 });
  await addSport(page, eventId, { name: sportName });
  await addTeam(page, eventId, { name: teamAName });
  await addTeam(page, eventId, { name: teamBName });
  await addTeam(page, eventId, { name: teamCName });

  await page.goto(`/app/events/${eventId}/standings`);
  await expect(page.getByText("Set points by position", { exact: true })).toBeVisible();

  // Point scale: 1st = 5, 2nd = 3, 3rd = 1.
  await page.getByLabel(/1st place points/i).fill("5");
  await page.getByLabel(/2nd place points/i).fill("3");
  await page.getByLabel(/3rd place points/i).fill("1");

  // Alpha and Bravo tie for 1st; Charlie finishes 3rd. The "Finish" select has an explicit
  // SelectProps aria-label in the source, but MUI's TextField also wires up its own label via
  // aria-labelledby, which wins over aria-label in accessible-name computation -- so instead of
  // relying on that custom name, scope to the one combobox inside this team's own table row
  // (only the position-calculator table has a <Select> per row; the leaderboard table below it
  // just shows plain text, so this stays unambiguous even though both tables list every team).
  async function setFinish(teamName, optionLabel) {
    const row = page.locator("tr", { hasText: teamName });
    await row.getByRole("combobox").click();
    await page.getByRole("option", { name: optionLabel, exact: true }).click();
  }
  await setFinish(teamAName, "1st");
  await setFinish(teamBName, "1st");
  await setFinish(teamCName, "3rd");

  // The calculator shows the split (5+3)/2 = 4 for the tied teams, 1 for Charlie, before saving.
  const calcTable = page.locator("table").first();
  const calcRowA = calcTable.locator("tr", { hasText: teamAName });
  const calcRowB = calcTable.locator("tr", { hasText: teamBName });
  const calcRowC = calcTable.locator("tr", { hasText: teamCName });
  await expect(calcRowA.locator("td").last()).toHaveText("4");
  await expect(calcRowB.locator("td").last()).toHaveText("4");
  await expect(calcRowC.locator("td").last()).toHaveText("1");

  await page.getByRole("button", { name: /Apply to points table/i }).click();
  await page.getByRole("button", { name: /^Save points$/i }).click();
  await expect(page.getByText("Standings saved", { exact: false })).toBeVisible({ timeout: 15000 });

  // The published leaderboard reflects the same split.
  const leaderboardTable = page.getByText(/^Leaderboard/).locator("xpath=following::table[1]");
  const rowA = leaderboardTable.locator("tr", { hasText: teamAName });
  const rowB = leaderboardTable.locator("tr", { hasText: teamBName });
  const rowC = leaderboardTable.locator("tr", { hasText: teamCName });
  await expect(rowA.locator("td").last()).toHaveText("4");
  await expect(rowB.locator("td").last()).toHaveText("4");
  await expect(rowC.locator("td").last()).toHaveText("1");

  // Also visible from the event overview's standings widget.
  await page.goto(`/app/events/${eventId}`);
  const overviewTable = page.locator("table").first();
  await expect(overviewTable.locator("tr", { hasText: teamAName }).locator("td").last()).toHaveText("4");
});
