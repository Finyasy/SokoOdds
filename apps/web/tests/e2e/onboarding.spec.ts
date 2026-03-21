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

  await expect(
    page.getByLabel("Market signals").getByRole("button", { name: "Trending now", exact: true })
  ).toBeVisible();
  await expect(
    page.getByLabel("Market signals").getByRole("button", { name: "Ending soon", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "All markets" })).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: /Nairobi mobility bill before June 30\?/i
    }).first()
  ).toBeVisible();
});

test("homepage header search and nav filter the board in place", async ({ page }) => {
  await page.goto("/");
  const boardGrid = page.getByTestId("market-board-grid");
  const searchInput = page.getByLabel("Market search input");

  await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Economy" }).click();
  await expect(searchInput).toHaveAttribute("placeholder", "Search economy markets...");
  await expect(
    boardGrid.getByRole("link", {
      name: /CBK cut rate before Sept 30\?/i
    }).first()
  ).toBeVisible();
  await expect(
    boardGrid.getByRole("link", {
      name: /Gor Mahia above AFC Leopards\?/i
    })
  ).toHaveCount(0);

  await searchInput.fill("mobility");
  await expect(page.getByTestId("market-board-empty")).toContainText(
    "Nothing in economy board matches"
  );
  await page.getByRole("button", { name: "Clear market search" }).click();
  await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Trending" }).click();
  await expect(
    boardGrid.getByRole("link", {
      name: /Nairobi mobility bill before June 30\?/i
    }).first()
  ).toBeVisible();
});

test("signal strip controls open focused discovery boards and keep active state visible", async ({
  page
}) => {
  await page.goto("/");
  const boardGrid = page.getByTestId("market-board-grid");
  const activeShortcut = page
    .getByLabel("Market signals")
    .getByRole("button", { name: "Ending soon economy" });

  await activeShortcut.click();

  await expect(page.getByTestId("market-board-focus")).toContainText("Ending soon economy");
  await expect(page.getByRole("heading", { name: "Ending soon economy" })).toBeVisible();
  await expect(page.getByText("Viewing ending soon economy board")).toBeVisible();
  await expect(page.getByLabel("Market search input")).toHaveAttribute(
    "placeholder",
    "Search ending soon economy..."
  );
  await expect(page).toHaveURL(/\/\?category=Economy&focus=ending-soon$/);
  await expect(activeShortcut).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByLabel("Market signals").getByRole("button", { name: "Ending soon", exact: true })
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    boardGrid.getByRole("link", {
      name: /KES above 135 per USD on June 30\?/i
    }).first()
  ).toBeVisible();

  await page.reload();

  await expect(page.getByRole("heading", { name: "Ending soon economy" })).toBeVisible();
  await expect(page.getByLabel("Market search input")).toHaveAttribute(
    "placeholder",
    "Search ending soon economy..."
  );
});

test("markets page stays feed-first and shows the expanded launch catalogue", async ({ page }) => {
  await page.goto("/markets");

  await expect(page.getByLabel("Market signals")).toBeVisible();
  await expect(
    page.getByLabel("Market signals").getByRole("button", { name: "Trending now", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "All markets" })).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: /IEBC chair nominee approved before Oct 31\?/i
    }).first()
  ).toBeVisible();
});

test("market board filters in place by category", async ({ page }) => {
  await page.goto("/markets");
  const boardGrid = page.getByTestId("market-board-grid");
  const searchInput = page.getByLabel("Market search input");

  await page.getByLabel("Category filters").getByRole("button", { name: "Economy" }).click();

  await expect(
    boardGrid.getByRole("link", {
      name: /CBK cut rate before Sept 30\?/i
    }).first()
  ).toBeVisible();
  await expect(
    boardGrid.getByRole("link", {
      name: /Gor Mahia above AFC Leopards\?/i
    })
  ).toHaveCount(0);
  await expect(page).toHaveURL(/\/markets\?category=Economy$/);

  await page.getByLabel("Market signals").getByRole("button", { name: "Ending soon economy" }).click();

  await expect(page.getByRole("heading", { name: "Ending soon economy" })).toBeVisible();
  await expect(searchInput).toHaveAttribute("placeholder", "Search ending soon economy...");
  await expect(page).toHaveURL(/\/markets\?category=Economy&focus=ending-soon$/);

  await page.reload();

  await expect(page.getByRole("heading", { name: "Ending soon economy" })).toBeVisible();
  await expect(searchInput).toHaveAttribute("placeholder", "Search ending soon economy...");
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

test("a verified wallet can initiate a KES 500 M-Pesa top-up from wallet setup", async ({
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

  await page.getByRole("button", { name: "Add KES 500 via M-Pesa" }).click();

  await expect(page.getByTestId("wallet-topup-success")).toBeVisible({
    timeout: 5000
  });
  await page.getByRole("button", { name: "Back to market" }).click();
  await expect(page.getByTestId("account-wallet-button")).toContainText("Ksh 505");
});

test("a verified wallet can submit KYC details from the wallet sheet", async ({ page }) => {
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

  await page.getByLabel("Legal name").fill("Bryan Bosire");
  await page.getByLabel("National ID number").fill("12345678");
  await page.getByLabel("Date of birth").fill("1998-04-13");
  await page.getByLabel("Document link or reference").fill("https://example.com/id.pdf");
  await page.getByRole("button", { name: "Submit KYC for review" }).click();

  await expect(page.getByTestId("kyc-pending-status")).toBeVisible({
    timeout: 5000
  });
  await page.getByRole("button", { name: "Back to market" }).click();
  await expect(page.getByTestId("account-wallet-button")).toContainText("KYC pending");
});

test("a funded wallet can withdraw KES 200 back to M-Pesa from the wallet sheet", async ({
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
  await page.getByRole("button", { name: "Add KES 500 via M-Pesa" }).click();
  await expect(page.getByTestId("wallet-topup-success")).toBeVisible({
    timeout: 5000
  });
  await expect(page.getByTestId("wallet-activity")).toContainText("M-Pesa wallet top-up");
  await expect(page.getByTestId("wallet-activity")).toContainText("Completed");

  await page.getByRole("button", { name: "Withdraw KES 200 to M-Pesa" }).click();
  await expect(page.getByTestId("wallet-withdrawal-success")).toBeVisible({
    timeout: 5000
  });
  await expect(page.getByTestId("wallet-activity")).toContainText("M-Pesa withdrawal");
  await page.getByRole("button", { name: "Back to market" }).click();
  await expect(page.getByTestId("account-wallet-button")).toContainText("Ksh 305");
});

test("an allowlisted admin can approve a pending KYC profile from the web review queue", async ({
  page
}) => {
  const applicantPhone = buildUniquePhone();

  await page.goto("/markets/nairobi-governor-bill-sign-before-june");

  await page.getByRole("button", { name: "Maybe later" }).click();
  await page.getByRole("button", { name: "Sign in to trade" }).first().click();
  await page.getByLabel("First name").fill("Bryan");
  await page.getByLabel("M-Pesa number").fill(applicantPhone);
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await page.getByRole("button", { name: "Send KES 5 verification" }).click();
  await expect(page.getByTestId("wallet-verification-success")).toBeVisible({
    timeout: 5000
  });

  await page.getByLabel("Legal name").fill("Bryan Bosire");
  await page.getByLabel("National ID number").fill("12345678");
  await page.getByLabel("Date of birth").fill("1998-04-13");
  await page.getByLabel("Document link or reference").fill("https://example.com/id.pdf");
  await page.getByRole("button", { name: "Submit KYC for review" }).click();
  await expect(page.getByTestId("kyc-pending-status")).toBeVisible({
    timeout: 5000
  });

  await page.context().clearCookies();
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/admin/kyc");

  await expect(page.getByTestId("admin-kyc-signin-required")).toBeVisible();
  await page.getByRole("button", { name: "Sign in as admin" }).click();
  await page.getByLabel("First name").fill("Admin");
  await page.getByLabel("M-Pesa number").fill("0712345678");
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await page.getByRole("button", { name: "Skip for now" }).click();

  await expect(page.getByTestId("admin-kyc-queue")).toContainText("Bryan Bosire", {
    timeout: 5000
  });
  const applicantCard = page
    .getByTestId("admin-kyc-item")
    .filter({ hasText: applicantPhone })
    .first();
  await expect(applicantCard).toContainText("Bryan Bosire");
  await applicantCard.getByRole("button", { name: "Approve" }).click();

  await expect(page.getByTestId("admin-kyc-queue")).not.toContainText(applicantPhone, {
    timeout: 5000
  });
});
