import { expect, test } from "@playwright/test";

function buildUniquePhone() {
  return `0796${Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0")}`;
}

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem("sokoodds.e2e.storage-cleared") === "true") {
      return;
    }

    window.localStorage.clear();
    window.sessionStorage.setItem("sokoodds.e2e.storage-cleared", "true");
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

test("markets page hydrates cleanly from persisted personalization state", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "sokoodds.feed-interactions",
      JSON.stringify({
        "gor-mahia-afc-leopards-april-derby": {
          viewedCount: 4,
          pausedCount: 2,
          openedCount: 1,
          lastInteractedAt: "2026-03-29T18:30:00.000Z"
        }
      })
    );
    window.localStorage.setItem(
      "sokoodds.discovery.streak",
      JSON.stringify({
        count: 5,
        lastCheckIn: "2026-03-29"
      })
    );
  });

  await page.goto("/markets");

  await expect(page.getByTestId("for-you-streak")).toContainText("5 days");
  await expect(page.getByTestId("for-you-ranking-notes")).toContainText("You keep viewing this in the feed");
  await expect(page.getByTestId("for-you-hub")).toBeVisible();
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
  await page.getByTestId("account-link-cash").click();
  await expect(page).toHaveURL(/\/cash$/);
  await expect(page.getByTestId("cash-signin-required")).toBeVisible();

  await page.goto("/account");
  await page.getByTestId("account-link-portfolio").click();
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

test("signed-in market detail can post, reply to, and like comments through the live API", async ({
  page
}) => {
  const marketUrl = "/markets/nairobi-governor-bill-sign-before-june";
  const phone = buildUniquePhone();
  const commentBody = `Comment from Playwright ${Date.now()}`;
  const replyBody = `Reply from Playwright ${Date.now()}`;

  await page.goto(marketUrl);

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

  const socialSection = page.locator(".market-tab-shell", { hasText: "Comments (" }).first();
  await socialSection.scrollIntoViewIfNeeded();
  const commentInput = socialSection.locator(".comment-compose input").first();
  await commentInput.scrollIntoViewIfNeeded();
  await expect(commentInput).toHaveAttribute("placeholder", "Add a comment...");
  await commentInput.fill(commentBody);
  await socialSection.getByRole("button", { name: "Post" }).click();

  const createdThread = socialSection.locator(".comment-card", { hasText: commentBody }).first();
  await expect(createdThread).toBeVisible();
  await expect(createdThread).toContainText("Bryan");
  await expect(
    createdThread.getByText("Following because you posted here", { exact: true })
  ).toBeVisible();

  await createdThread.getByRole("button", { name: "Reply" }).click();
  await createdThread.getByPlaceholder("Write a reply...").fill(replyBody);
  await createdThread.getByRole("button", { name: "Reply" }).last().click();

  const createdReply = createdThread.locator(".comment-card--reply", { hasText: replyBody }).first();
  await expect(createdReply).toBeVisible();

  await createdReply.getByRole("button", { name: "Like" }).click();
  await expect(createdReply.getByRole("button", { name: "Liked" })).toBeVisible();
  await expect(createdReply).toContainText("1 likes");

  await page.goto(`${marketUrl}?refresh=${Date.now()}`);
  await expect(page.locator(".comment-card", { hasText: commentBody }).first()).toBeVisible();
  await expect(page.locator(".comment-card--reply", { hasText: replyBody }).first()).toBeVisible();
});

test("followed threads show live unread replies and can be caught up", async ({
  browser,
  page,
}) => {
  const marketUrl = "/markets/nairobi-governor-bill-sign-before-june";
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
  const authorPhone = buildUniquePhone();
  const responderPhone = buildUniquePhone();
  const commentBody = `Thread follow root ${Date.now()}`;
  const replyBody = `Thread follow reply ${Date.now()}`;

  await page.goto(marketUrl);

  await page.getByRole("button", { name: "Maybe later" }).click();
  await page.getByRole("button", { name: "Create account to trade" }).click();
  await page.getByLabel("First name").fill("Bryan");
  await page.getByLabel("M-Pesa number").fill(authorPhone);
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await page.getByRole("button", { name: "Send KES 5 verification" }).click();

  await expect(page.getByTestId("wallet-verification-success")).toBeVisible({
    timeout: 5000,
  });
  await page.getByRole("button", { name: "Back to market" }).click();

  const socialSection = page.locator(".market-tab-shell", { hasText: "Comments (" }).first();
  const commentInput = socialSection.locator(".comment-compose input").first();
  await commentInput.scrollIntoViewIfNeeded();
  await commentInput.fill(commentBody);
  await socialSection.getByRole("button", { name: "Post" }).click();

  const createdThread = socialSection.locator(".comment-card", { hasText: commentBody }).first();
  await expect(createdThread).toBeVisible();
  await expect(page.getByTestId("comment-follow-rail")).toContainText("Auto-following because you posted here");

  const responderContext = await browser.newContext();
  const responderPage = await responderContext.newPage();

  try {
    await responderPage.goto(`${baseUrl}${marketUrl}`);
    await responderPage.getByRole("button", { name: "Maybe later" }).click();
    await responderPage.getByRole("button", { name: "Create account to trade" }).click();
    await responderPage.getByLabel("First name").fill("Nia");
    await responderPage.getByLabel("M-Pesa number").fill(responderPhone);
    await responderPage.getByRole("button", { name: "Continue to wallet setup" }).click();
    await responderPage.getByRole("button", { name: "Skip for now" }).click();

    const responderSocialSection = responderPage
      .locator(".market-tab-shell", { hasText: "Comments (" })
      .first();
    const responderThread = responderSocialSection
      .locator(".comment-card", { hasText: commentBody })
      .first();
    await responderThread.scrollIntoViewIfNeeded();
    await responderThread.getByRole("button", { name: "Reply" }).click();
    await responderThread.getByPlaceholder("Write a reply...").fill(replyBody);
    await responderThread.getByRole("button", { name: "Reply" }).last().click();
    await expect(
      responderThread.locator(".comment-card--reply", { hasText: replyBody }).first(),
    ).toBeVisible();
  } finally {
    await responderContext.close().catch(() => undefined);
  }

  await page.goto(`${marketUrl}?refresh=${Date.now()}`);

  const reloadedSocialSection = page.locator(".market-tab-shell", { hasText: "Comments (" }).first();
  const followedRail = page.getByTestId("comment-follow-rail");
  const followedThreadChip = followedRail.locator(".comment-follow-chip", { hasText: commentBody }).first();
  await expect(reloadedSocialSection).toBeVisible();
  await reloadedSocialSection.scrollIntoViewIfNeeded();
  await expect(page.getByTestId("comment-thread-alert")).toContainText("1 new thread update");
  await expect(followedThreadChip).toContainText("1 unread reply");
  await expect(followedThreadChip).toContainText("Latest by Nia");
  await followedThreadChip.getByRole("button", { name: "Catch up" }).click();
  await expect(page.getByTestId("comment-thread-alert")).toHaveCount(0);
  await expect(followedThreadChip).toContainText("Auto-following because you posted here");

  await page.goto(`${marketUrl}?refresh=${Date.now()}`);
  await expect(page.getByTestId("comment-thread-alert")).toHaveCount(0);
  await expect(
    page.getByTestId("comment-follow-rail").locator(".comment-follow-chip", { hasText: commentBody }).first(),
  ).toContainText("Auto-following because you posted here");
});

test("for-you thread updates stay aligned with live followed replies", async ({
  browser,
  page,
}) => {
  const marketUrl = "/markets/nairobi-governor-bill-sign-before-june";
  const authorPhone = buildUniquePhone();
  const responderPhone = buildUniquePhone();
  const commentBody = `For you thread root ${Date.now()}`;
  const replyBody = `For you thread reply ${Date.now()}`;
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

  await page.goto(marketUrl);
  await page.getByRole("button", { name: "Maybe later" }).click();
  await page.getByRole("button", { name: "Create account to trade" }).click();
  await page.getByLabel("First name").fill("Brian");
  await page.getByLabel("M-Pesa number").fill(authorPhone);
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await page.getByRole("button", { name: "Send KES 5 verification" }).click();
  await expect(page.getByTestId("wallet-verification-success")).toBeVisible({
    timeout: 5000,
  });
  await page.getByRole("button", { name: "Back to market" }).click();

  const socialSection = page.locator(".market-tab-shell", { hasText: "Comments (" }).first();
  const commentInput = socialSection.locator(".comment-compose input").first();
  await commentInput.scrollIntoViewIfNeeded();
  await commentInput.fill(commentBody);
  await socialSection.getByRole("button", { name: "Post" }).click();
  await expect(socialSection.locator(".comment-card", { hasText: commentBody }).first()).toBeVisible();

  const responderContext = await browser.newContext();
  const responderPage = await responderContext.newPage();

  try {
    await responderPage.goto(`${baseUrl}${marketUrl}`);
    await responderPage.getByRole("button", { name: "Maybe later" }).click();
    await responderPage.getByRole("button", { name: "Create account to trade" }).click();
    await responderPage.getByLabel("First name").fill("Amina");
    await responderPage.getByLabel("M-Pesa number").fill(responderPhone);
    await responderPage.getByRole("button", { name: "Continue to wallet setup" }).click();
    await responderPage.getByRole("button", { name: "Skip for now" }).click();

    const responderThread = responderPage
      .locator(".comment-card", { hasText: commentBody })
      .first();
    await responderThread.scrollIntoViewIfNeeded();
    await responderThread.getByRole("button", { name: "Reply" }).click();
    await responderThread.getByPlaceholder("Write a reply...").fill(replyBody);
    await responderThread.getByRole("button", { name: "Reply" }).last().click();
    await expect(
      responderThread.locator(".comment-card--reply", { hasText: replyBody }).first(),
    ).toBeVisible();
  } finally {
    await responderContext.close().catch(() => undefined);
  }

  await page.goto("/markets");

  const threadUpdates = page.getByTestId("for-you-thread-updates");
  await expect(threadUpdates).toContainText("1 reply alert");
  await expect(threadUpdates).toContainText(commentBody);
  await expect(threadUpdates).toContainText("Latest by Amina");
  await expect(threadUpdates).toContainText("1 unread");
  await threadUpdates.getByRole("button", { name: "Catch up" }).click();
  await expect(threadUpdates).toContainText("No unread replies");

  await page.reload();
  await expect(page.getByTestId("for-you-thread-updates")).toContainText("No unread replies");
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
  const adminDialogDismissButton = page.locator(".dialog-actions button").last();
  await adminDialogDismissButton.scrollIntoViewIfNeeded();
  await adminDialogDismissButton.click();

  await expect(page.getByTestId("admin-kyc-queue")).toContainText("Bryan Bosire", {
    timeout: 5000
  });
  const applicantCard = page
    .getByTestId("admin-kyc-item")
    .filter({ hasText: applicantPhone })
    .first();
  await expect(applicantCard).toContainText("Bryan Bosire");
  await applicantCard.getByRole("button", { name: "Approve" }).click();

  await page.getByLabel("KYC queue status filters").getByRole("button", { name: "approved" }).click();
  await expect
    .poll(async () => page.getByTestId("admin-kyc-board").textContent(), {
      timeout: 5000,
    })
    .toContain(applicantPhone);
  await expect(page.getByTestId("admin-kyc-board")).toContainText("approved", {
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

test("an allowlisted admin can hide and restore a live market comment from the web queue", async ({
  page
}) => {
  const phone = buildUniquePhone();
  const commentBody = `Moderation candidate ${Date.now()}`;

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

  const socialSection = page.locator(".market-tab-shell", { hasText: "Comments (" }).first();
  const commentInput = socialSection.locator(".comment-compose input").first();
  await commentInput.scrollIntoViewIfNeeded();
  await commentInput.fill(commentBody);
  await socialSection.getByRole("button", { name: "Post" }).click();
  await expect(socialSection.locator(".comment-card", { hasText: commentBody }).first()).toBeVisible();

  await page.context().clearCookies();
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/admin/markets");

  await expect(page.getByTestId("admin-market-comments-signin-required")).toBeVisible();
  await page.getByRole("button", { name: "Sign in as admin" }).click();
  await page.getByLabel("First name").fill("Admin");
  await page.getByLabel("M-Pesa number").fill("0712345678");
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await expect
    .poll(
      async () =>
        (await page.getByTestId("admin-market-comments-board").isVisible().catch(() => false)) ||
        (await page.locator(".dialog-actions button").count()) > 0,
      { timeout: 5000 }
    )
    .toBe(true);
  if (!(await page.getByTestId("admin-market-comments-board").isVisible().catch(() => false))) {
    await page.locator(".dialog-actions button").last().click();
  }

  await expect(page.getByTestId("admin-market-comments-board")).toBeVisible({ timeout: 5000 });
  const visibleItem = page
    .getByTestId("admin-market-comments-item")
    .filter({ hasText: commentBody })
    .first();
  await expect(visibleItem).toBeVisible({ timeout: 5000 });
  await visibleItem.getByRole("button", { name: "Hide comment" }).click();

  await page.getByLabel("Market comment queue status filters").getByRole("button", { name: "hidden" }).click();
  const hiddenItem = page
    .getByTestId("admin-market-comments-item")
    .filter({ hasText: commentBody })
    .first();
  await expect(hiddenItem).toBeVisible({ timeout: 5000 });
  await expect(hiddenItem).toContainText("hidden");

  await page.goto(`/markets/nairobi-governor-bill-sign-before-june?refresh=${Date.now()}`);
  const refreshedSocialSection = page.locator(".market-tab-shell", { hasText: "Comments (" }).first();
  await refreshedSocialSection.scrollIntoViewIfNeeded();
  await expect(refreshedSocialSection.locator(".comment-card", { hasText: commentBody })).toHaveCount(0);

  await page.goto("/admin/markets");
  await page.getByLabel("Market comment queue status filters").getByRole("button", { name: "hidden" }).click();
  const restoreItem = page
    .getByTestId("admin-market-comments-item")
    .filter({ hasText: commentBody })
    .first();
  await restoreItem.getByRole("button", { name: "Restore comment" }).click();

  await page.getByLabel("Market comment queue status filters").getByRole("button", { name: "visible" }).click();
  await expect(
    page.getByTestId("admin-market-comments-item").filter({ hasText: commentBody }).first()
  ).toBeVisible({ timeout: 5000 });

  await page.goto(`/markets/nairobi-governor-bill-sign-before-june?refresh=${Date.now()}`);
  const restoredSocialSection = page.locator(".market-tab-shell", { hasText: "Comments (" }).first();
  await restoredSocialSection.scrollIntoViewIfNeeded();
  await expect(restoredSocialSection.locator(".comment-card", { hasText: commentBody }).first()).toBeVisible();
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

test("submitted orders stay in sync across ticket, market detail, and portfolio", async ({
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
  await expect(page.getByText("1 live orders here").first()).toBeVisible();

  await page.getByRole("button", { name: "Positions" }).click();
  await expect(page.getByTestId("market-detail-positions")).toContainText("No live position yet");
  await expect(page.getByTestId("market-detail-positions")).toContainText("1 orders");
  await expect(page.getByTestId("market-detail-personalization")).toContainText("1 live orders here");

  await page.goto("/portfolio");

  await expect(page.getByTestId("portfolio-open-order-count")).toContainText("1 live");
  await expect(page.getByTestId("portfolio-orders")).toContainText("Nairobi mobility bill");
  await expect(page.getByTestId("portfolio-market-exposure")).toContainText("Nairobi mobility bill");
  await expect(page.getByTestId("portfolio-reserved-order-value")).toContainText("Ksh 4.96");
});

test("a signed-in holder can place a sell order and see committed shares in portfolio", async ({
  page
}) => {
  const phone = buildUniquePhone();
  await page.addInitScript(() => {
    window.sessionStorage.setItem("sokoodds.whatsappPromptShownSession", "1");
  });
  const account = {
    user: {
      id: "holder-1",
      firstName: "Brian",
      phone,
      mpesaPhone: phone,
      mpesaVerified: true,
      kycStatus: "approved",
      isAdmin: false
    },
    wallet: {
      currency: "KES",
      availableBalanceKes: "5.00",
      reservedBalanceKes: "0.00"
    }
  };
  let portfolioFetchCount = 0;

  await page.route("**/api/account/portfolio/orders", async (route) => {
    portfolioFetchCount += 1;
    const hasLiveSellOrder = portfolioFetchCount > 1;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        account,
        exposure: {
          openOrderCount: hasLiveSellOrder ? 1 : 0,
          reservedOrderValueKes: "0.00"
        },
        items: hasLiveSellOrder
          ? [
              {
                id: "sell-order-1",
                marketId: "demo-market-kenya-election",
                marketSlug: "nairobi-governor-bill-sign-before-june",
                marketLabel: "Nairobi mobility bill",
                marketQuestion: "Will the Nairobi mobility bill be signed before June?",
                side: "YES",
                direction: "SELL",
                price: "0.62",
                quantity: "8.00",
                reservedAmountKes: "0.00",
                status: "submitted",
                createdAt: "2026-04-29T08:00:00.000Z"
              }
            ]
          : [],
        positions: [
          {
            marketId: "demo-market-kenya-election",
            marketSlug: "nairobi-governor-bill-sign-before-june",
            marketLabel: "Nairobi mobility bill",
            marketQuestion: "Will the Nairobi mobility bill be signed before June?",
            side: "YES",
            shares: "12.00",
            averageEntryPriceKes: "0.44",
            markPriceKes: "0.62",
            costBasisKes: "5.28",
            marketValueKes: "7.44",
            unrealizedPnlKes: "2.16",
            realizedPnlKes: "0.00",
            updatedAt: "2026-04-29T08:00:00.000Z"
          }
        ],
        fills: [],
        markets: hasLiveSellOrder
          ? [
              {
                marketId: "demo-market-kenya-election",
                marketSlug: "nairobi-governor-bill-sign-before-june",
                marketLabel: "Nairobi mobility bill",
                marketQuestion: "Will the Nairobi mobility bill be signed before June?",
                activeOrderCount: 1,
                reservedAmountKes: "0.00",
                totalQuantity: "8.00",
                averageEntryPriceKes: "0.62",
                latestYesPriceKes: "0.62",
                latestNoPriceKes: "0.38"
              }
            ]
          : [],
        recentPrints: []
      })
    });
  });

  await page.route("**/api/orders", async (route) => {
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      headers: {
        "X-Idempotency-Status": "created"
      },
      body: JSON.stringify({
        order_id: "sell-order-1",
        status: "submitted",
        market_id: "demo-market-kenya-election",
        reserved_amount: "0.00",
        available_balance: "5.00",
        reserved_balance: "0.00"
      })
    });
  });

  await page.route("**/api/account/transactions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        account,
        items: []
      })
    });
  });

  await page.route("**/api/account/kyc", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "null"
    });
  });

  await page.goto("/markets/nairobi-governor-bill-sign-before-june");

  const maybeLaterButton = page.getByRole("button", { name: "Maybe later" });
  if (await maybeLaterButton.isVisible().catch(() => false)) {
    await maybeLaterButton.click();
  }
  await page.getByRole("button", { name: "Create account to trade" }).click();
  await page.getByLabel("First name").fill("Brian");
  await page.getByLabel("M-Pesa number").fill(phone);
  await page.getByRole("button", { name: "Continue to wallet setup" }).click();
  await page.getByRole("button", { name: "Send KES 5 verification" }).click();
  await expect(page.getByTestId("wallet-verification-success")).toBeVisible({
    timeout: 5000
  });
  await page.getByRole("button", { name: "Back to market" }).click();
  await page.getByRole("button", { name: "Sell" }).click();
  await expect(page.getByRole("button", { name: "Sell 8 YES shares" })).toBeVisible();

  await page.getByRole("button", { name: "Sell 8 YES shares" }).click();

  await expect(page.getByTestId("order-ticket-success")).toContainText("resting 8 YES shares");

  await page.goto("/portfolio");

  await expect(page.getByTestId("portfolio-orders")).toContainText("SELL YES");
  await expect(page.getByTestId("portfolio-orders")).toContainText("8.00 shares committed");
  await expect(page.getByTestId("portfolio-market-exposure")).toContainText(
    "8.00 shares committed on sells"
  );
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

  await page.getByTestId("account-wallet-button").getByRole("button", { name: "Deposit" }).click();
  await expect(page.getByRole("dialog")).toContainText("Verify your M-Pesa for instant withdrawals.");
  await page.getByRole("button", { name: "Back to market" }).click();

  await page.getByRole("link", { name: "Open account and product menu" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByTestId("header-menu-action-documentation").click();
  await expect(page).toHaveURL(/\/docs$/);

  await page.getByRole("link", { name: "Open account and product menu" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByTestId("header-menu-action-help-center").click();
  await expect(page).toHaveURL(/\/help$/);

  await page.getByRole("link", { name: "Open account and product menu" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByTestId("header-menu-action-leaderboard").click();
  await expect(page).toHaveURL(/\/leaderboard$/);
});

test("utility menu dark mode toggle persists across reloads", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");

  await page.getByRole("link", { name: "Open account and product menu" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByRole("menuitem", { name: "Dark mode" }).click();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => window.localStorage.getItem("sokoodds.theme"))).toBe("dark");

  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => window.localStorage.getItem("sokoodds.theme"))).toBe("dark");
});

test("admin can hide and restore the latest reply from thread updates", async ({ page }) => {
  await page.route("**/api/account/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        account: {
          user: {
            id: "admin-user",
            firstName: "Admin",
            phone: "0712345678",
            mpesaPhone: "0712345678",
            mpesaVerified: true,
            kycStatus: "approved",
            isAdmin: true
          },
          wallet: {
            currency: "KES",
            availableBalanceKes: "505.00",
            reservedBalanceKes: "0.00"
          }
        }
      })
    });
  });

  await page.route("**/api/account/comment-threads/follows", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [] })
    });
  });

  await page.route("**/api/account/comment-threads/notifications", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            marketSlug: "cbk-cut-rate-before-september-end",
            marketQuestion: "Will CBK cut rates before September ends?",
            commentId: "comment-1",
            commentAuthor: "Amina",
            commentBody: "Watching the next MPC signal closely.",
            unreadReplyCount: 2,
            totalReplyCount: 3,
            autoFollowed: true,
            latestReplyCommentId: "reply-9",
            latestReplyAuthor: "Brian",
            latestReplyBody: "Treasury pressure looks stronger this week.",
            latestReplyAt: "2026-04-09T09:30:00+03:00"
          }
        ]
      })
    });
  });

  await page.route("**/api/markets/cbk-cut-rate-before-september-end/comments/reply-9/hide", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "reply-9"
      })
    });
  });

  await page.route(
    "**/api/markets/cbk-cut-rate-before-september-end/comments/reply-9/restore",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "reply-9"
        })
      });
    }
  );

  await page.goto("/markets");

  const threadUpdates = page.getByTestId("for-you-thread-updates");
  await expect(threadUpdates).toContainText("Will CBK cut rates before September ends?");
  await expect(threadUpdates).toContainText("Hide latest reply");

  await threadUpdates.getByRole("button", { name: "Hide latest reply" }).click();
  await expect(threadUpdates).toContainText("Latest reply hidden");
  await expect(threadUpdates).toContainText("Restore reply");

  await threadUpdates.getByRole("button", { name: "Restore reply" }).click();
  await expect(threadUpdates).toContainText("Hide latest reply");
});

test("admin can hide and restore a reply inline on market detail", async ({ page }) => {
  const phone = "0712345678";
  const commentBody = `Inline moderation comment ${Date.now()}`;
  const replyBody = `Inline moderation reply ${Date.now()}`;

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

  const socialSection = page.locator(".market-tab-shell", { hasText: "Comments (" }).first();
  await socialSection.scrollIntoViewIfNeeded();
  const commentInput = socialSection.locator(".comment-compose input").first();
  await commentInput.fill(commentBody);
  await socialSection.getByRole("button", { name: "Post" }).click();

  const createdThread = socialSection.locator(".comment-card", { hasText: commentBody }).first();
  await expect(createdThread).toBeVisible();

  await createdThread.getByRole("button", { name: "Reply" }).click();
  await createdThread.getByPlaceholder("Write a reply...").fill(replyBody);
  await createdThread.getByRole("button", { name: "Reply" }).last().click();

  const createdReply = createdThread.locator(".comment-card--reply", { hasText: replyBody }).first();
  await expect(createdReply).toBeVisible();
  await createdReply.getByRole("button", { name: "Hide reply" }).click();

  await expect(createdThread).toContainText("Reply hidden");
  await expect(createdThread).toContainText("Restore reply");
  await expect(createdThread).not.toContainText(replyBody);

  await createdThread.getByRole("button", { name: "Restore reply" }).click();
  await expect(createdThread.locator(".comment-card--reply", { hasText: replyBody }).first()).toBeVisible();
  await expect(createdThread.getByRole("button", { name: "Hide reply" }).first()).toBeVisible();
});
