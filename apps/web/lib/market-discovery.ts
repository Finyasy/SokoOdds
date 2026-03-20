import type { Market, MarketCategory } from "@/lib/mock-data";

export type DiscoveryCategory = "All" | MarketCategory;

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

export function parseDiscoveryCategory(value: string | null | undefined): DiscoveryCategory {
  if (!value) {
    return "All";
  }

  return discoveryCategories.includes(value as DiscoveryCategory)
    ? (value as DiscoveryCategory)
    : "All";
}

export function filterDiscoveryMarkets(
  markets: Market[],
  category: DiscoveryCategory,
  searchQuery: string
) {
  const trimmedQuery = searchQuery.trim().toLowerCase();

  return markets.filter((market) => {
    const matchesCategory = category === "All" ? true : market.category === category;

    if (!trimmedQuery) {
      return matchesCategory;
    }

    const haystack = [
      market.question,
      market.shortLabel,
      market.summary,
      market.region,
      market.category
    ]
      .join(" ")
      .toLowerCase();

    return matchesCategory && haystack.includes(trimmedQuery);
  });
}

export function buildDiscoveryHref(
  pathname: string,
  category: DiscoveryCategory,
  searchQuery: string
) {
  const params = new URLSearchParams();

  if (category !== "All") {
    params.set("category", category);
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
