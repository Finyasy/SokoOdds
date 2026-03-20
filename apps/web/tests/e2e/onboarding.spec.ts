import { expect, test } from "@playwright/test";

function buildUniquePhone() {
  return `0796${Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0")}`;
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test("homepage opens directly on the discovery markets surface", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "All markets" })).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: /Nairobi mobility bill before June 30\?/i
    }).first()
  ).toBeVisible();
});

test("markets page stays feed-first and shows the expanded launch catalogue", async ({ page }) => {
  await page.goto("/markets");

  await expect(page.getByRole("heading", { name: "All markets" })).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: /IEBC chair nominee approved before Oct 31\?/i
    }).first()
  ).toBeVisible();
});

test("market detail opens with the first-time WhatsApp prompt", async ({ page }) => {
  await page.goto("/markets/nairobi-governor-bill-sign-before-june");

  await expect(page.getByRole("dialog")).toContainText("Follow SokoOdds on WhatsApp");
  await expect(
    page.getByRole("heading", {
      name: "Will Nairobi county sign the urban mobility bill before June 30, 2026?"
    })
  ).toBeVisible();

  await page.getByRole("button", { name: "Maybe later" }).click();

  await expect(page.getByText("Follow SokoOdds on WhatsApp")).toHaveCount(0);
});

test("first-time account setup can reach the M-Pesa verification success state", async ({ page }) => {
  const phone = buildUniquePhone();

  await page.goto("/markets/nairobi-governor-bill-sign-before-june");

  await page.getByRole("button", { name: "Maybe later" }).click();
  await page.getByRole("button", { name: "Sign in to trade" }).first().click();
  await page.getByLabel("First name").fill("Bryan");
  await page.getByLabel("M-Pesa number").fill(phone);
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();

  await expect(page.getByRole("heading", { name: "Verify your M-Pesa for instant withdrawals." })).toBeVisible();
  await page.getByRole("button", { name: "Send KES 5 verification" }).click();

  await expect(page.getByTestId("wallet-verification-success")).toBeVisible({
    timeout: 5000
  });
  await page.getByRole("button", { name: "Back to market" }).click();

  await expect(page.getByTestId("account-wallet-button")).toContainText("M-Pesa ready");
  await expect(page.getByTestId("account-wallet-button")).toContainText("Ksh 5");

  await page.reload();

  await expect(page.getByTestId("account-wallet-button")).toContainText("M-Pesa ready");
  await expect(page.getByTestId("account-wallet-button")).toContainText("Ksh 5");
});

test("a verified first-time wallet can place the sample order and move funds into reserve", async ({
  page
}) => {
  const phone = buildUniquePhone();

  await page.goto("/markets/nairobi-governor-bill-sign-before-june");

  await page.getByRole("button", { name: "Maybe later" }).click();
  await page.getByRole("button", { name: "Sign in to trade" }).first().click();
  await page.getByLabel("First name").fill("Bryan");
  await page.getByLabel("M-Pesa number").fill(phone);
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await page.getByRole("button", { name: "Send KES 5 verification" }).click();
  await expect(page.getByTestId("wallet-verification-success")).toBeVisible({
    timeout: 5000
  });
  await page.getByRole("button", { name: "Back to market" }).click();

  await page.getByRole("button", { name: /Buy 8 YES shares/i }).click();

  await expect(page.getByTestId("order-ticket-success")).toBeVisible();
  await expect(page.getByTestId("order-ticket-reserved-balance")).toContainText("Ksh 4.96");
  await expect(page.getByTestId("order-ticket-available-balance")).toContainText("Ksh 0.04");
});
