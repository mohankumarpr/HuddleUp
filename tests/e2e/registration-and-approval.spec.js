const { test, expect } = require("@playwright/test");
const { uniqueSuffix, signUpOrganizer, createEvent, addSport, getEventSlug } = require("./utils/helpers");

test("public registers for an event, organizer approves it into the player pool", async ({ page, browser }) => {
  const suffix = uniqueSuffix();
  const email = `organizer-${suffix}@example.com`;
  const password = "Passw0rd!123";
  const orgName = `Test Org ${suffix}`;
  const eventName = `Open Tournament ${suffix}`;
  const sportName = `Chess ${suffix}`;
  const playerName = `Riley Player ${suffix}`;
  const playerEmail = `riley-${suffix}@example.com`;

  await signUpOrganizer(page, { displayName: "Sam Organizer", orgName, email, password });
  const eventId = await createEvent(page, { name: eventName, purseDefault: 5000 });
  await addSport(page, eventId, { name: sportName });

  const slug = await getEventSlug(eventId);

  // A member of the public, in a completely separate, signed-out browser context, submits a
  // registration via the public link -- no organizer session should leak into this context.
  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  try {
    await publicPage.goto(`/e/${slug}/register`);
    await expect(publicPage.getByText(eventName, { exact: true })).toBeVisible();

    await publicPage.getByLabel(/Full name/i).fill(playerName);
    await publicPage.getByLabel(/^Email/i).fill(playerEmail);
    await publicPage.getByLabel(/Contact number/i).fill("9876500000");
    await publicPage.getByText(sportName, { exact: true }).click(); // toggles the sport chip

    await publicPage.getByRole("button", { name: /Submit registration/i }).click();
    await expect(publicPage.getByText(`Thanks, ${playerName}!`, { exact: false })).toBeVisible({ timeout: 15000 });
  } finally {
    await publicContext.close();
  }

  // Organizer reviews and approves the registration. This event is freshly created for this test
  // alone, so there's exactly one pending registration -- no need to scope to a specific row.
  await page.goto(`/app/events/${eventId}/registrations`);
  await expect(page.getByText(playerName, { exact: false })).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: /^Approve$/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/Base price/i).fill("150");
  await dialog.getByRole("button", { name: /Add to player pool/i }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  // The pending queue no longer lists them.
  await expect(page.getByText(playerName, { exact: false })).toHaveCount(0, { timeout: 15000 });

  // And the player pool does.
  await page.goto(`/app/events/${eventId}/players`);
  await expect(page.getByText(playerName, { exact: false })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Base price 150/, { exact: false })).toBeVisible();
});
