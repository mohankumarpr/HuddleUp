const { test, expect } = require("@playwright/test");
const { uniqueSuffix, signUpOrganizer, createEvent } = require("./utils/helpers");

test("organizer signs up, creates an event, and sees it in the dashboard", async ({ page }) => {
  const suffix = uniqueSuffix();
  const email = `organizer-${suffix}@example.com`;
  const password = "Passw0rd!123";
  const orgName = `Test Org ${suffix}`;
  const eventName = `Spring Games ${suffix}`;

  await signUpOrganizer(page, { displayName: "Jordan Organizer", orgName, email, password });

  // Fresh org has no events yet.
  await expect(page.getByText("You haven't created an event yet", { exact: false })).toBeVisible();

  const eventId = await createEvent(page, { name: eventName, venue: "Community Hall", purseDefault: 10000 });
  expect(eventId).toBeTruthy();

  // Landed on the event overview, and it actually rendered (not stuck on a spinner).
  await expect(page.getByRole("heading", { name: eventName })).toBeVisible();
  await expect(page.getByText("Teams", { exact: true }).first()).toBeVisible();

  // The event list shows it too.
  await page.goto("/app/events");
  await expect(page.getByText(eventName, { exact: true })).toBeVisible();
  await expect(page.getByText("Community Hall", { exact: true })).toBeVisible();

  // Navigating back into it from the list works and lands on the same overview.
  await page.getByText(eventName, { exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/app/events/${eventId}$`));
  await expect(page.getByRole("heading", { name: eventName })).toBeVisible();
});
