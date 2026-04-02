import type { Market, MarketCategory } from "@/lib/mock-data";

export type DiscoveryCategory = "All" | MarketCategory;
export type DiscoveryFocus = "all" | "trending" | "ending-soon";
export type FeedNotificationPreferences = {
  dailyPulse: boolean;
  priceMoves: boolean;
  resolutionSoon: boolean;
  newDrops: boolean;
};

export type FeedInteractionSignal = {
  viewedCount: number;
  pausedCount: number;
  openedCount: number;
  lastInteractedAt: string | null;
};

export type MarketRecommendation = {
  market: Market;
  score: number;
  reasons: string[];
};

export const discoveryCategories: DiscoveryCategory[] = [
  "All",
  "Politics",
  "Football",
  "Economy",
  "Weather",
  "Culture"
];

export const discoveryNavItems: Array<{ label: string; value: DiscoveryCategory }> = [
  { label: "Trending", value: "All" },
  { label: "Politics", value: "Politics" },
  { label: "Football", value: "Football" },
  { label: "Economy", value: "Economy" },
  { label: "Weather", value: "Weather" },
  { label: "Culture", value: "Culture" }
];

export const discoveryFocuses: DiscoveryFocus[] = ["all", "trending", "ending-soon"];

export function parseDiscoveryCategory(value: string | null | undefined): DiscoveryCategory {
  if (!value) {
    return "All";
  }

  return discoveryCategories.includes(value as DiscoveryCategory)
    ? (value as DiscoveryCategory)
    : "All";
}

export function parseDiscoveryFocus(value: string | null | undefined): DiscoveryFocus {
  if (!value) {
    return "all";
  }

  return discoveryFocuses.includes(value as DiscoveryFocus) ? (value as DiscoveryFocus) : "all";
}

function byVolumeDesc(a: Market, b: Market) {
  return b.volumeKes - a.volumeKes;
}

function byClosingAsc(a: Market, b: Market) {
  return new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime();
}

export function filterDiscoveryMarkets(
  markets: Market[],
  category: DiscoveryCategory,
  searchQuery: string,
  focus: DiscoveryFocus = "all"
) {
  const trimmedQuery = searchQuery.trim().toLowerCase();

  const categoryAndSearchFiltered = markets.filter((market) => {
    const matchesCategory = category === "All" ? true : market.category === category;
    const haystack = [
      market.question,
      market.shortLabel,
      market.summary,
      market.region,
      market.category
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = trimmedQuery ? haystack.includes(trimmedQuery) : true;

    return matchesCategory && matchesSearch;
  });

  if (focus === "ending-soon") {
    return categoryAndSearchFiltered
      .filter((market) => market.status === "Closing Soon")
      .sort(byClosingAsc);
  }

  if (focus === "trending") {
    return [...categoryAndSearchFiltered].sort(byVolumeDesc);
  }

  return categoryAndSearchFiltered;
}

export function buildDiscoveryHref(
  pathname: string,
  category: DiscoveryCategory,
  searchQuery: string,
  focus: DiscoveryFocus = "all"
) {
  const params = new URLSearchParams();

  if (category !== "All") {
    params.set("category", category);
  }

  if (focus !== "all") {
    params.set("focus", focus);
  }

  const trimmedQuery = searchQuery.trim();
  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  }

  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export function readSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function formatDiscoveryFocusLabel(focus: DiscoveryFocus) {
  if (focus === "trending") {
    return "Trending";
  }

  if (focus === "ending-soon") {
    return "Ending soon";
  }

  return "All";
}

export function formatDiscoveryBoardScope(
  category: DiscoveryCategory,
  focus: DiscoveryFocus = "all"
) {
  if (focus !== "all") {
    const focusLabel = formatDiscoveryFocusLabel(focus).toLowerCase();
    if (category === "All") {
      return `${focusLabel} markets`;
    }

    return `${focusLabel} ${category.toLowerCase()} board`;
  }

  if (category !== "All") {
    return `${category.toLowerCase()} board`;
  }

  return "the market board";
}

export function formatDiscoverySearchPlaceholder(
  category: DiscoveryCategory,
  focus: DiscoveryFocus = "all"
) {
  if (focus === "all" && category === "All") {
    return "Search markets...";
  }

  if (focus === "all") {
    return `Search ${category.toLowerCase()} markets...`;
  }

  if (category === "All") {
    return `Search ${formatDiscoveryFocusLabel(focus).toLowerCase()} markets...`;
  }

  return `Search ${formatDiscoveryFocusLabel(focus).toLowerCase()} ${category.toLowerCase()}...`;
}

function toCategoryCounts(markets: Market[]) {
  return markets.reduce(
    (accumulator, market) => {
      accumulator[market.category] = (accumulator[market.category] ?? 0) + 1;
      return accumulator;
    },
    {} as Partial<Record<MarketCategory, number>>
  );
}

function buildReasonList({
  market,
  recentMarketSlugs,
  watchlist,
  preferredCategories,
  categoryCounts,
  notificationPreferences,
  feedInteractions
}: {
  market: Market;
  recentMarketSlugs: string[];
  watchlist: string[];
  preferredCategories: MarketCategory[];
  categoryCounts: Partial<Record<MarketCategory, number>>;
  notificationPreferences: FeedNotificationPreferences;
  feedInteractions: Record<string, FeedInteractionSignal>;
}) {
  const reasons: string[] = [];
  const interaction = feedInteractions[market.slug];

  if (watchlist.includes(market.slug)) {
    reasons.push("Saved to your watchlist");
  }
  if (recentMarketSlugs.includes(market.slug)) {
    reasons.push("You opened this recently");
  }
  if (interaction?.openedCount) {
    reasons.push("You open this from the feed");
  } else if (interaction?.pausedCount) {
    reasons.push("You slow down on this in the feed");
  } else if (interaction?.viewedCount) {
    reasons.push("You keep viewing this in the feed");
  }
  if ((categoryCounts[market.category] ?? 0) > 0) {
    reasons.push(`You keep coming back to ${market.category.toLowerCase()} markets`);
  } else if (preferredCategories.includes(market.category)) {
    reasons.push(`Fits your current ${market.category.toLowerCase()} lean`);
  }
  if (market.status === "Closing Soon" && notificationPreferences.resolutionSoon) {
    reasons.push("Resolves soon and matches your alert settings");
  }
  if (notificationPreferences.priceMoves && market.trades.length >= 3) {
    reasons.push("Active price action right now");
  }
  if (market.volumeKes >= 500_000) {
    reasons.push("High-volume market");
  }

  return reasons.slice(0, 3);
}

export function rankMarketsForUser(
  markets: Market[],
  input: {
    watchlist: string[];
    recentMarketSlugs: string[];
    preferredCategories: MarketCategory[];
    notificationPreferences: FeedNotificationPreferences;
    feedInteractions?: Record<string, FeedInteractionSignal>;
  }
) {
  const recentSet = new Set(input.recentMarketSlugs);
  const watchlistSet = new Set(input.watchlist);
  const feedInteractions = input.feedInteractions ?? {};
  const recentMarkets = input.recentMarketSlugs
    .map((slug) => markets.find((market) => market.slug === slug))
    .filter((market): market is Market => Boolean(market));
  const watchlistMarkets = input.watchlist
    .map((slug) => markets.find((market) => market.slug === slug))
    .filter((market): market is Market => Boolean(market));
  const categoryCounts = toCategoryCounts([...recentMarkets, ...watchlistMarkets]);

  return [...markets]
    .map((market) => {
      let score = market.volumeKes / 1000 + market.trades.length * 24;

      if (input.preferredCategories.includes(market.category)) {
        score += 260;
      }
      if ((categoryCounts[market.category] ?? 0) > 0) {
        score += 190 + (categoryCounts[market.category] ?? 0) * 35;
      }
      if (watchlistSet.has(market.slug)) {
        score += 340;
      }
      if (recentSet.has(market.slug)) {
        const recencyIndex = input.recentMarketSlugs.indexOf(market.slug);
        score += 280 - Math.max(recencyIndex, 0) * 45;
      }
      if (market.status === "Closing Soon") {
        score += input.notificationPreferences.resolutionSoon ? 180 : 90;
      }
      if (input.notificationPreferences.priceMoves) {
        score += market.trades.length * 18;
      }
      if (input.notificationPreferences.newDrops && market.status === "Open") {
        score += 55;
      }
      if (input.notificationPreferences.dailyPulse) {
        score += Math.min(market.volumeKes / 4000, 90);
      }
      if (feedInteractions[market.slug]) {
        const interaction = feedInteractions[market.slug];
        score += interaction.viewedCount * 18;
        score += interaction.pausedCount * 46;
        score += interaction.openedCount * 90;
      }

      return {
        market,
        score,
        reasons: buildReasonList({
          market,
          recentMarketSlugs: input.recentMarketSlugs,
          watchlist: input.watchlist,
          preferredCategories: input.preferredCategories,
          categoryCounts,
          notificationPreferences: input.notificationPreferences,
          feedInteractions
        })
      } satisfies MarketRecommendation;
    })
    .sort((left, right) => right.score - left.score);
}
