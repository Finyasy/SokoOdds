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
    return await fetchFromApi<Market[]>("/markets");
  } catch {
    return fallbackMarkets;
  }
}

export async function getMarketBySlug(slug: string): Promise<Market | undefined> {
  try {
    return await fetchFromApi<Market>(`/markets/${slug}`);
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
