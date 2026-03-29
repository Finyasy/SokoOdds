import {
  endingSoonMarkets as fallbackEndingSoonMarkets,
  featuredMarkets as fallbackFeaturedMarkets,
  getMarketBySlug as getFallbackMarketBySlug,
  kenyaPulseMarkets as fallbackKenyaPulseMarkets,
  markets as fallbackMarkets,
  type Market
} from "@/lib/mock-data";

type HomepageMarketGroups = {
  featuredMarkets: Market[];
  endingSoonMarkets: Market[];
  kenyaPulseMarkets: Market[];
};

const fallbackMarketBySlug = new Map(fallbackMarkets.map((market) => [market.slug, market]));

function mergePresentationData(market: Market): Market {
  const fallback = fallbackMarketBySlug.get(market.slug);

  if (!fallback) {
    return market;
  }

  return {
    ...market,
    category: market.category ?? fallback.category,
    region: market.region || fallback.region,
    shortLabel: fallback.shortLabel,
    summary: market.summary || fallback.summary,
    resolutionSource: market.resolutionSource || fallback.resolutionSource,
    ruleHighlights: market.ruleHighlights?.length ? market.ruleHighlights : fallback.ruleHighlights,
    trustNotes: market.trustNotes?.length ? market.trustNotes : fallback.trustNotes,
    orderBook: market.orderBook?.yesBids?.length ? market.orderBook : fallback.orderBook,
    trades: market.trades?.length ? market.trades : fallback.trades,
    identity: fallback.identity
      ? {
          ...fallback.identity,
          ...market.identity,
          primary: market.identity?.primary ?? fallback.identity.primary,
          label: market.identity?.label ?? fallback.identity.label
        }
      : market.identity,
    history: market.history?.length ? market.history : fallback.history,
    boardOptions: market.boardOptions?.length ? market.boardOptions : fallback.boardOptions,
    cardMeta: market.cardMeta?.length ? market.cardMeta : fallback.cardMeta,
    showMiniChart: market.showMiniChart ?? fallback.showMiniChart,
    heroSeries: market.heroSeries?.length ? market.heroSeries : fallback.heroSeries,
    heroComments: market.heroComments?.length ? market.heroComments : fallback.heroComments
  };
}

function getApiBaseUrl() {
  const baseUrl =
    process.env.SOKOODDS_API_SERVER_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:8000/api/v1";

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

async function fetchFromApi<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    next: { revalidate: 30 }
  });

  if (!response.ok) {
    throw new Error(`API request failed for ${path} with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getMarkets(): Promise<Market[]> {
  try {
    const markets = await fetchFromApi<Market[]>("/markets");
    return markets.map(mergePresentationData);
  } catch {
    return fallbackMarkets;
  }
}

export async function getMarketBySlug(slug: string): Promise<Market | undefined> {
  try {
    const market = await fetchFromApi<Market>(`/markets/${slug}`);
    return mergePresentationData(market);
  } catch {
    return getFallbackMarketBySlug(slug);
  }
}

export async function getHomepageMarketGroups(): Promise<HomepageMarketGroups> {
  try {
    const markets = await getMarkets();

    return {
      featuredMarkets: markets.slice(0, 3),
      endingSoonMarkets: markets.filter((market) => market.status === "Closing Soon"),
      kenyaPulseMarkets: markets.filter((market) =>
        ["Politics", "Football", "Economy"].includes(market.category)
      )
    };
  } catch {
    return {
      featuredMarkets: fallbackFeaturedMarkets,
      endingSoonMarkets: fallbackEndingSoonMarkets,
      kenyaPulseMarkets: fallbackKenyaPulseMarkets
    };
  }
}
