const { test, expect } = require("@playwright/test");
const { uniqueSuffix, signUpOrganizer, createEvent, addTeam } = require("./utils/helpers");

// Covers two related changes: amounts display in the lakh/crore shorthand auctions actually use
// (instead of a wall of zeros), and the organizer can normalize every player to one base price at
// once instead of editing each player by hand.
test("base prices display as lakhs/crore, and the organizer can set one base price for every player", async ({
  page,
}) => {
  const suffix = uniqueSuffix();
  const email = `organizer-${suffix}@example.com`;
  const password = "Passw0rd!123";
  const orgName = `Test Org ${suffix}`;
  const eventName = `Lakh Crore Night ${suffix}`;
  const teamName = `Royals ${suffix}`;
  const playerA = `Alex Player ${suffix}`; // picks up the CSV's own base_price
  const playerB = `Bailey Player ${suffix}`; // no base_price column value -- falls back to the default

  await signUpOrganizer(page, { displayName: "Morgan Organizer", orgName, email, password });
  const eventId = await createEvent(page, { name: eventName, purseDefault: 100000000 });
  await addTeam(page, eventId, { name: teamName, purseTotal: 100000000 });

  // One row with an explicit crore-scale base price, one row with none at all -- the latter should
  // pick up the import screen's "Default base price" field, which should itself now default to 50
  // lakhs instead of the old placeholder value of 100. It's entered in lakh/crore units with a unit
  // picker, not raw rupees, so 50 lakhs shows as "50" with "Lakh" selected.
  await page.goto(`/app/events/${eventId}/import`);
  const defaultBasePriceField = page.getByLabel(/^Default base price$/i);
  await expect(defaultBasePriceField).toHaveValue("50");

  const csv = `name,base_price\n${playerA},12500000\n${playerB},\n`;
  await page.locator('[data-testid="csv-input"]').setInputFiles({
    name: "players.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(page.getByText(playerA, { exact: false })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /^Import 2 players$/i }).click();
  await expect(page.getByText(/^Imported 2 players/, { exact: false })).toBeVisible({ timeout: 15000 });

  // The player pool shows each one's base price in lakh/crore shorthand, not raw rupees.
  await page.goto(`/app/events/${eventId}/players`);
  await expect(page.getByText(playerA, { exact: false })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Base price 1.25 crore", { exact: false })).toBeVisible();
  await expect(page.getByText("Base price 50 lakhs", { exact: false })).toBeVisible();

  // The organizer sets one base price for every player at once, from the Roster planning panel --
  // entered as "60" lakhs (the field defaults to the Lakh unit), not the raw rupee figure.
  const basePriceField = page.getByLabel(/^Base price for every player$/i);
  await basePriceField.fill("60");
  await page.getByRole("button", { name: /^Set for all players$/i }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^Set for all players$/i }).click();

  await expect(page.getByText("Base price 60 lakhs", { exact: false }).first()).toBeVisible({ timeout: 15000 });
  // Neither of the old prices should remain -- both players were overwritten.
  await expect(page.getByText("Base price 1.25 crore", { exact: false })).toBeHidden();
  await expect(page.getByText("Base price 50 lakhs", { exact: false })).toBeHidden();
});
