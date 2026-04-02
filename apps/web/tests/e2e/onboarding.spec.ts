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
    page.getByRole("heading", { name: "Will Bitcoin trade above $110K by April 30?" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Breaking news" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "All markets" })).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: /Nairobi mobility bill/i
    }).first()
  ).toBeVisible();
});

test("homepage header search and nav filter the board in place", async ({ page }) => {
  await page.goto("/");
  const boardGrid = page.getByTestId("market-board-grid");
  const searchInput = page.getByLabel("Market search input");

  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Economy" }).click();
  await expect(searchInput).toHaveAttribute("placeholder", "Search economy markets...");
  await expect(
    boardGrid.getByRole("link", {
      name: /CBK rate cut/i
    }).first()
  ).toBeVisible();
  await expect(
    boardGrid.getByRole("link", {
      name: /Gor Mahia above AFC/i
    })
  ).toHaveCount(0);

  await searchInput.fill("mobility");
  await expect(page.getByTestId("market-board-empty")).toContainText(
    "Nothing in economy board matches"
  );
  await page.getByRole("button", { name: "Clear market search" }).click();
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Trending" }).click();
  await expect(
    boardGrid.getByRole("link", {
      name: /Nairobi mobility bill/i
    }).first()
  ).toBeVisible();
});

test("signal strip controls open focused discovery boards and keep active state visible", async ({
  page
}) => {
  await page.goto("/markets");
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
  await expect(page).toHaveURL(/\/markets\?category=Economy&focus=ending-soon$/);
  await expect(activeShortcut).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByLabel("Market signals").getByRole("button", { name: "Ending soon", exact: true })
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    boardGrid.getByRole("link", {
      name: /KES above 135/i
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

  await expect(page.getByTestId("for-you-hub")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your market rhythm starts here." })).toBeVisible();
  await expect(page.getByTestId("for-you-streak")).toContainText("0 days");
  await expect(page.getByTestId("for-you-missions")).toContainText("Check in and keep your streak");
  await expect(page.getByLabel("Market signals")).toBeVisible();
  await expect(
    page.getByLabel("Market signals").getByRole("button", { name: "Trending now", exact: true })
  ).toBeVisible();
  await expect(page.getByTestId("market-board-grid")).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: /IEBC chair/i
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
      name: /CBK rate cut/i
    }).first()
  ).toBeVisible();
  await expect(
    boardGrid.getByRole("link", {
      name: /Gor Mahia above AFC/i
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

test("primary market nav buttons switch categories across the full header rail", async ({
  page
}) => {
  await page.goto("/markets");

  const primaryNav = page.getByRole("navigation", { name: "Primary" });
  const cases = [
    { label: "Trending", url: /\/markets$/, placeholder: "Search markets..." },
    { label: "Politics", url: /\/markets\?category=Politics$/, placeholder: "Search politics markets..." },
    { label: "Football", url: /\/markets\?category=Football$/, placeholder: "Search football markets..." },
    { label: "Economy", url: /\/markets\?category=Economy$/, placeholder: "Search economy markets..." },
    { label: "Weather", url: /\/markets\?category=Weather$/, placeholder: "Search weather markets..." },
    { label: "Culture", url: /\/markets\?category=Culture$/, placeholder: "Search culture markets..." }
  ];

  for (const item of cases) {
    await primaryNav.getByRole("link", { name: item.label }).click();
    await expect(page).toHaveURL(item.url);
    await expect(page.getByLabel("Market search input")).toHaveAttribute(
      "placeholder",
      item.placeholder
    );
    await expect(primaryNav.getByRole("link", { name: item.label })).toHaveClass(
      /site-nav__item--active/
    );
  }
});

test("auth and account fallback routes stay reachable from the header", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Log In" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign Up" })).toBeVisible();

  await page.goto("/account/access?mode=login");
  await expect(page.getByRole("heading", { name: "Reconnect your SokoOdds wallet." })).toBeVisible();

  await page.goto("/account/access?mode=signup");
  await expect(page.getByRole("heading", { name: "Create your SokoOdds wallet." })).toBeVisible();

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Open the part of SokoOdds you need next." })).toBeVisible();
});

test("major nav and account routes stay reachable from the primary shell", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Politics" }).click();
  await expect(page).toHaveURL(/\/markets\?category=Politics$/);
  await expect(page.getByLabel("Market search input")).toHaveAttribute(
    "placeholder",
    "Search politics markets..."
  );

  await page.getByRole("link", { name: /Nairobi mobility bill/i }).first().click();
  await expect(
    page.getByRole("heading", {
      name: "Will Nairobi county sign the urban mobility bill before June 30, 2026?"
    })
  ).toBeVisible();
  await page.getByRole("button", { name: "Maybe later" }).click();

  await page.getByRole("link", { name: "Open account and product menu" }).click();
  await expect(page.getByRole("menu")).toBeVisible();

  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Open the part of SokoOdds you need next." })).toBeVisible();
  await page.getByRole("link", { name: /Open Cash/i }).click();
  await expect(page).toHaveURL(/\/cash$/);
  await expect(page.getByTestId("cash-signin-required")).toBeVisible();

  await page.goto("/account");
  await page.getByRole("link", { name: /Open Portfolio/i }).click();
  await expect(page).toHaveURL(/\/portfolio$/);
  await expect(page.getByTestId("portfolio-signin-required")).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Sign Up" }).click();
  await expect(page.getByRole("heading", { name: "Create your SokoOdds trading profile." })).toBeVisible();
});

test("market detail opens with the first-time WhatsApp prompt", async ({ page }) => {
  await page.goto("/markets/nairobi-governor-bill-sign-before-june");

  await expect(page.getByRole("dialog")).toContainText("Get SokoOdds market alerts on WhatsApp");
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
  await page.getByRole("button", { name: "Create account to trade" }).click();
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
  await page.getByRole("button", { name: "Create account to trade" }).click();
  await page.getByLabel("First name").fill("Bryan");
  await page.getByLabel("M-Pesa number").fill(phone);
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await page.getByRole("button", { name: "Send KES 5 verification" }).click();
  await expect(page.getByTestId("wallet-verification-success")).toBeVisible({
    timeout: 5000
  });
  await page.getByRole("button", { name: "Back to market" }).click();

  await page.getByRole("button", { name: /Buy \d+ YES shares/i }).click();

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
  await page.getByRole("button", { name: "Create account to trade" }).click();
  await page.getByLabel("First name").fill("Bryan");
  await page.getByLabel("M-Pesa number").fill(phone);
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await page.getByRole("button", { name: "Send KES 5 verification" }).click();

  await expect(page.getByTestId("wallet-verification-success")).toBeVisible({
    timeout: 5000
  });

  await page.getByRole("dialog").getByRole("button", { name: "Add KES 500 via M-Pesa" }).click();

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
  await page.getByRole("button", { name: "Create account to trade" }).click();
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
  await page.getByRole("button", { name: "Create account to trade" }).click();
  await page.getByLabel("First name").fill("Bryan");
  await page.getByLabel("M-Pesa number").fill(phone);
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await page.getByRole("button", { name: "Send KES 5 verification" }).click();

  await expect(page.getByTestId("wallet-verification-success")).toBeVisible({
    timeout: 5000
  });
  await page.getByRole("dialog").getByRole("button", { name: "Add KES 500 via M-Pesa" }).click();
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
  await page.getByRole("button", { name: "Create account to trade" }).click();
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

test("an allowlisted admin can inspect withdrawal support activity from the web support queue", async ({
  page
}) => {
  const customerPhone = buildUniquePhone();

  await page.goto("/markets/nairobi-governor-bill-sign-before-june");

  await page.getByRole("button", { name: "Maybe later" }).click();
  await page.getByRole("button", { name: "Create account to trade" }).click();
  await page.getByLabel("First name").fill("Amina");
  await page.getByLabel("M-Pesa number").fill(customerPhone);
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await page.getByRole("button", { name: "Send KES 5 verification" }).click();
  await expect(page.getByTestId("wallet-verification-success")).toBeVisible({
    timeout: 5000
  });
  await page.getByRole("dialog").getByRole("button", { name: "Add KES 500 via M-Pesa" }).click();
  await expect(page.getByTestId("wallet-topup-success")).toBeVisible({
    timeout: 5000
  });
  await page.getByRole("button", { name: "Withdraw KES 200 to M-Pesa" }).click();
  await expect(page.getByTestId("wallet-withdrawal-success")).toBeVisible({
    timeout: 5000
  });

  await page.context().clearCookies();
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/admin/support");

  await expect(page.getByTestId("admin-support-signin-required")).toBeVisible();
  await page.getByRole("button", { name: "Sign in as admin" }).click();
  await page.getByLabel("First name").fill("Admin");
  await page.getByLabel("M-Pesa number").fill("0712345678");
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await page.getByRole("button", { name: "Skip for now" }).click();

  await page.getByLabel("Money support kind filters").getByRole("button", { name: "Withdrawal" }).click();
  await expect(page.getByTestId("admin-support-queue")).toContainText(customerPhone, {
    timeout: 5000
  });
  await expect(page.getByTestId("admin-support-queue")).toContainText("M-Pesa withdrawal");
  await page.getByLabel("Money support status filters").getByRole("button", { name: "completed" }).click();
  await expect(page.getByTestId("admin-support-queue")).toContainText(customerPhone);
});

test("portfolio page asks signed-out users to authenticate", async ({ page }) => {
  await page.goto("/portfolio");

  await expect(page.getByTestId("portfolio-signin-required")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in to continue" })).toBeVisible();
});

test("cash page asks signed-out users to authenticate", async ({ page }) => {
  await page.goto("/cash");

  await expect(page.getByTestId("cash-signin-required")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in to continue" })).toBeVisible();
});

test("portfolio page shows wallet, KYC, and recent activity for a verified user", async ({
  page
}) => {
  const phone = buildUniquePhone();

  await page.goto("/markets/nairobi-governor-bill-sign-before-june");

  await page.getByRole("button", { name: "Maybe later" }).click();
  await page.getByRole("button", { name: "Create account to trade" }).click();
  await page.getByLabel("First name").fill("Brian");
  await page.getByLabel("M-Pesa number").fill(phone);
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await page.getByRole("button", { name: "Send KES 5 verification" }).click();
  await expect(page.getByTestId("wallet-verification-success")).toBeVisible({
    timeout: 5000
  });
  await page.getByRole("dialog").getByRole("button", { name: "Add KES 500 via M-Pesa" }).click();
  await expect(page.getByTestId("wallet-topup-success")).toBeVisible({
    timeout: 5000
  });
  await page.getByRole("button", { name: "Back to market" }).click();
  await page.getByRole("button", { name: /Buy \d+ YES shares/i }).click();
  await expect(page.getByTestId("order-ticket-success")).toBeVisible();

  await page.goto("/portfolio");

  await expect(page.getByTestId("portfolio-overview")).toBeVisible();
  await expect(page.getByTestId("portfolio-available-balance")).toContainText("Ksh 500.04");
  await expect(page.getByTestId("portfolio-phone")).toContainText(phone);
  await expect(page.getByTestId("portfolio-activity")).toContainText("M-Pesa wallet top-up");
  await expect(page.getByTestId("portfolio-open-order-count")).toContainText("1 live");
  await expect(page.getByTestId("portfolio-reserved-order-value")).toContainText("Ksh 4.96");
  await expect(page.getByTestId("portfolio-orders")).toContainText("Nairobi mobility bill");
  await expect(page.getByTestId("portfolio-market-exposure")).toContainText("Nairobi mobility bill");
  await expect(page.getByTestId("portfolio-recent-prints")).toContainText("YES print");
});

test("markets for-you hub personalizes after wallet verification and check-in", async ({ page }) => {
  const phone = buildUniquePhone();

  await page.goto("/markets");

  await expect(page.getByTestId("for-you-streak")).toContainText("0 days");
  await page.getByRole("button", { name: "Check in now" }).click();
  await expect(page.getByTestId("for-you-streak")).toContainText("1 days");
  await expect(page.getByTestId("for-you-missions")).toContainText("Daily check-in locked");

  await page.goto("/markets/nairobi-governor-bill-sign-before-june");
  await page.getByRole("button", { name: "Maybe later" }).click();
  await page.getByRole("button", { name: "Create account to trade" }).click();
  await page.getByLabel("First name").fill("Brian");
  await page.getByLabel("M-Pesa number").fill(phone);
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await page.getByRole("button", { name: "Send KES 5 verification" }).click();
  await expect(page.getByTestId("wallet-verification-success")).toBeVisible({
    timeout: 5000
  });

  await page.goto("/markets");

  await expect(page.getByRole("heading", { name: "Brian, here’s your market rhythm." })).toBeVisible();
  await expect(page.getByTestId("for-you-cash-ready")).toContainText("Ksh 5");
  await expect(page.getByTestId("for-you-missions")).toContainText("Wallet ready");
  await expect(page.getByTestId("for-you-picked-count")).toContainText("6 markets");
});

test("cash page shows funding readiness and wallet activity for a verified user", async ({
  page
}) => {
  const phone = buildUniquePhone();

  await page.goto("/markets/nairobi-governor-bill-sign-before-june");

  await page.getByRole("button", { name: "Maybe later" }).click();
  await page.getByRole("button", { name: "Create account to trade" }).click();
  await page.getByLabel("First name").fill("Brian");
  await page.getByLabel("M-Pesa number").fill(phone);
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await page.getByRole("button", { name: "Send KES 5 verification" }).click();
  await expect(page.getByTestId("wallet-verification-success")).toBeVisible({
    timeout: 5000
  });
  await page.getByRole("dialog").getByRole("button", { name: "Add KES 500 via M-Pesa" }).click();
  await expect(page.getByTestId("wallet-topup-success")).toBeVisible({
    timeout: 5000
  });

  await page.goto("/cash");

  await expect(page.getByTestId("cash-overview")).toBeVisible();
  await expect(page.getByTestId("cash-available-balance")).toContainText("Ksh 505");
  await expect(page.getByTestId("cash-reserved-balance")).toContainText("Ksh 0");
  await expect(page.getByTestId("cash-wallet-readiness")).toContainText("Wallet ready");
  await expect(page.getByTestId("cash-activity")).toContainText("M-Pesa wallet top-up");
  await expect(page.getByTestId("cash-activity")).toContainText("M-Pesa wallet verified");
});

test("wallet state stays consistent across header, cash, and portfolio after funding", async ({
  page
}) => {
  const phone = buildUniquePhone();

  await page.goto("/markets/nairobi-governor-bill-sign-before-june");

  await page.getByRole("button", { name: "Maybe later" }).click();
  await page.getByRole("button", { name: "Create account to trade" }).click();
  await page.getByLabel("First name").fill("Brian");
  await page.getByLabel("M-Pesa number").fill(phone);
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await page.getByRole("button", { name: "Send KES 5 verification" }).click();
  await expect(page.getByTestId("wallet-verification-success")).toBeVisible({
    timeout: 5000
  });
  await page.getByRole("dialog").getByRole("button", { name: "Add KES 500 via M-Pesa" }).click();
  await expect(page.getByTestId("wallet-topup-success")).toBeVisible({
    timeout: 5000
  });

  await expect(page.getByTestId("account-wallet-button")).toContainText("M-Pesa ready");
  await expect(page.getByTestId("account-wallet-button")).toContainText("Ksh 505");

  await page.goto("/cash");

  await expect(page.getByTestId("cash-overview")).toBeVisible();
  await expect(page.getByTestId("cash-available-balance")).toContainText("Ksh 505");
  await expect(page.getByTestId("cash-reserved-balance")).toContainText("Ksh 0");
  await expect(page.getByTestId("cash-wallet-readiness")).toContainText("Wallet ready");

  await page.goto("/portfolio");

  await expect(page.getByTestId("portfolio-overview")).toBeVisible();
  await expect(page.getByTestId("portfolio-phone")).toContainText(phone);
  await expect(page.getByTestId("portfolio-available-balance")).toContainText("Ksh 505");
  await expect(page.getByTestId("portfolio-reserved-balance")).toContainText("Ksh 0");
});

test("signed-in header routes and utility menu stay usable after wallet setup", async ({
  page
}) => {
  const phone = buildUniquePhone();

  await page.goto("/markets/nairobi-governor-bill-sign-before-june");

  await page.getByRole("button", { name: "Maybe later" }).click();
  await page.getByRole("button", { name: "Create account to trade" }).click();
  await page.getByLabel("First name").fill("Brian");
  await page.getByLabel("M-Pesa number").fill(phone);
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await page.getByRole("button", { name: "Send KES 5 verification" }).click();
  await expect(page.getByTestId("wallet-verification-success")).toBeVisible({
    timeout: 5000
  });
  await page.getByRole("dialog").getByRole("button", { name: "Add KES 500 via M-Pesa" }).click();
  await expect(page.getByTestId("wallet-topup-success")).toBeVisible({
    timeout: 5000
  });
  await page.getByRole("button", { name: "Back to market" }).click();

  await page.getByRole("link", { name: /Cash Ksh/i }).click();
  await expect(page).toHaveURL(/\/cash$/);
  await expect(page.getByTestId("cash-overview")).toBeVisible();

  await page.getByRole("link", { name: /Portfolio Ksh/i }).click();
  await expect(page).toHaveURL(/\/portfolio$/);
  await expect(page.getByTestId("portfolio-overview")).toBeVisible();

  await page.getByRole("button", { name: "Deposit" }).click();
  await expect(page.getByRole("dialog")).toContainText("Verify your M-Pesa for instant withdrawals.");
  await page.getByRole("button", { name: "Back to market" }).click();

  await page.getByRole("link", { name: "Open account and product menu" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByRole("menuitem", { name: "Documentation" }).click();
  await expect(page).toHaveURL(/\/docs$/);

  await page.getByRole("link", { name: "Open account and product menu" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByRole("menuitem", { name: "Help Center" }).click();
  await expect(page).toHaveURL(/\/help$/);
});
