import type { Market, MarketCategory } from "@/lib/mock-data";

export type DiscoveryCategory = "All" | MarketCategory;
export type DiscoveryFocus = "all" | "trending" | "ending-soon";

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
