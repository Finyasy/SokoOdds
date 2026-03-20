export type MarketCategory =
  | "Politics"
  | "Football"
  | "Economy"
  | "Weather"
  | "Culture";

export type MarketStatus = "Open" | "Closing Soon" | "Resolved";

export type OrderBookLevel = {
  price: number;
  shares: number;
};

export type TradePrint = {
  id: string;
  side: "YES" | "NO";
  price: number;
  shares: number;
  time: string;
};

export type Market = {
  id: string;
  slug: string;
  category: MarketCategory;
  status: MarketStatus;
  question: string;
  shortLabel: string;
  summary: string;
  region: string;
  yesPrice: number;
  noPrice: number;
  volumeKes: number;
  liquidityKes: number;
  closesAt: string;
  resolutionSource: string;
  ruleHighlights: string[];
  trustNotes: string[];
  orderBook: {
    yesBids: OrderBookLevel[];
    noBids: OrderBookLevel[];
  };
  trades: TradePrint[];
};

export const markets: Market[] = [
  {
    id: "demo-market-kenya-election",
    slug: "nairobi-governor-bill-sign-before-june",
    category: "Politics",
    status: "Open",
    question: "Will Nairobi county sign the urban mobility bill before June 30, 2026?",
    shortLabel: "Nairobi mobility bill before June 30?",
    summary:
      "A public-affairs contract tracking whether the county executive formally signs the proposed urban mobility bill before the stated deadline.",
    region: "Kenya Public Affairs",
    yesPrice: 0.62,
    noPrice: 0.38,
    volumeKes: 486000,
    liquidityKes: 190000,
    closesAt: "2026-06-30T18:00:00+03:00",
    resolutionSource: "Official Nairobi County Gazette notice or county executive release.",
    ruleHighlights: [
      "Resolves YES if a formal signing notice is published by June 30, 2026 at 6:00 PM EAT.",
      "Draft approvals, committee votes, or public promises do not count as final signature.",
      "If the county publishes conflicting statements, the later official gazette-style notice governs."
    ],
    trustNotes: [
      "Resolution uses an official county source.",
      "Market is monitored for high-volume policy-day volatility.",
      "All outcomes and evidence are published on the market page after settlement."
    ],
    orderBook: {
      yesBids: [
        { price: 0.61, shares: 220 },
        { price: 0.6, shares: 340 },
        { price: 0.58, shares: 480 }
      ],
      noBids: [
        { price: 0.39, shares: 190 },
        { price: 0.4, shares: 310 },
        { price: 0.42, shares: 405 }
      ]
    },
    trades: [
      { id: "t-1001", side: "YES", price: 0.62, shares: 120, time: "14:05" },
      { id: "t-1002", side: "NO", price: 0.38, shares: 80, time: "13:49" },
      { id: "t-1003", side: "YES", price: 0.61, shares: 60, time: "13:22" }
    ]
  },
  {
    id: "market-gor-mahia-finish-above-afc-leopards",
    slug: "gor-mahia-finish-above-afc-leopards",
    category: "Football",
    status: "Open",
    question: "Will Gor Mahia finish above AFC Leopards in the 2026 FKF Premier League table?",
    shortLabel: "Gor Mahia above AFC Leopards?",
    summary:
      "A league-table market based on final FKF Premier League standings at the end of the 2026 season.",
    region: "Kenya Football",
    yesPrice: 0.68,
    noPrice: 0.32,
    volumeKes: 731000,
    liquidityKes: 254000,
    closesAt: "2026-09-12T17:00:00+03:00",
    resolutionSource: "Official FKF Premier League final standings.",
    ruleHighlights: [
      "Resolves YES if Gor Mahia ends the season in a strictly higher table position than AFC Leopards.",
      "If points are level, official league tiebreakers determine the result.",
      "If the season is abandoned with no official final table, the market resolves VOID."
    ],
    trustNotes: [
      "Resolution follows the final official league table only.",
      "Closing states and pauses can be triggered near season-end controversy or sanctions news.",
      "Users can review rule history in the audit panel once live."
    ],
    orderBook: {
      yesBids: [
        { price: 0.67, shares: 450 },
        { price: 0.66, shares: 600 },
        { price: 0.64, shares: 720 }
      ],
      noBids: [
        { price: 0.33, shares: 280 },
        { price: 0.34, shares: 410 },
        { price: 0.36, shares: 500 }
      ]
    },
    trades: [
      { id: "t-2001", side: "YES", price: 0.68, shares: 150, time: "15:01" },
      { id: "t-2002", side: "YES", price: 0.67, shares: 90, time: "14:44" },
      { id: "t-2003", side: "NO", price: 0.33, shares: 75, time: "14:08" }
    ]
  },
  {
    id: "market-kes-close-above-135-june",
    slug: "kes-close-above-135-june",
    category: "Economy",
    status: "Closing Soon",
    question: "Will the Kenya shilling close above 135 per USD on June 30, 2026?",
    shortLabel: "KES above 135 per USD on June 30?",
    summary:
      "A macro market tracking the official end-of-day exchange rate threshold against the US dollar.",
    region: "Kenya Economy",
    yesPrice: 0.41,
    noPrice: 0.59,
    volumeKes: 392000,
    liquidityKes: 165000,
    closesAt: "2026-06-30T17:00:00+03:00",
    resolutionSource: "Official Central Bank of Kenya end-of-day rate publication.",
    ruleHighlights: [
      "Resolves YES if the official closing rate is strictly above 135.00.",
      "Intraday highs do not count.",
      "If the publication is delayed, settlement waits for the official release."
    ],
    trustNotes: [
      "Resolution waits for the official CBK publication, not media estimates.",
      "Large macro-news bursts may trigger volatility notices on the market page.",
      "Final settlement notes are published alongside the official rate reference."
    ],
    orderBook: {
      yesBids: [
        { price: 0.4, shares: 180 },
        { price: 0.39, shares: 260 },
        { price: 0.37, shares: 320 }
      ],
      noBids: [
        { price: 0.6, shares: 240 },
        { price: 0.61, shares: 380 },
        { price: 0.63, shares: 460 }
      ]
    },
    trades: [
      { id: "t-3001", side: "NO", price: 0.59, shares: 130, time: "15:18" },
      { id: "t-3002", side: "YES", price: 0.41, shares: 95, time: "14:57" },
      { id: "t-3003", side: "NO", price: 0.58, shares: 70, time: "14:29" }
    ]
  },
  {
    id: "market-long-rains-above-normal-nakuru",
    slug: "long-rains-above-normal-nakuru",
    category: "Weather",
    status: "Open",
    question: "Will Nakuru record above-normal rainfall during the 2026 long-rains season?",
    shortLabel: "Above-normal long rains in Nakuru?",
    summary:
      "A seasonal weather market using the official long-rains rainfall assessment for Nakuru county.",
    region: "Kenya Weather",
    yesPrice: 0.55,
    noPrice: 0.45,
    volumeKes: 228000,
    liquidityKes: 98000,
    closesAt: "2026-07-31T18:00:00+03:00",
    resolutionSource: "Kenya Meteorological Department seasonal rainfall summary.",
    ruleHighlights: [
      "Resolves YES if the official county-level summary classifies rainfall as above normal.",
      "Private weather dashboards do not override the official publication.",
      "If county-level classification is unavailable, the market resolves using the nearest official replacement note."
    ],
    trustNotes: [
      "Weather markets are resolved only from named official meteorological sources.",
      "Seasonal summaries may take longer to settle than sports or politics markets.",
      "Settlement notes explain any source substitutions explicitly."
    ],
    orderBook: {
      yesBids: [
        { price: 0.54, shares: 140 },
        { price: 0.53, shares: 200 },
        { price: 0.51, shares: 300 }
      ],
      noBids: [
        { price: 0.46, shares: 130 },
        { price: 0.47, shares: 205 },
        { price: 0.49, shares: 290 }
      ]
    },
    trades: [
      { id: "t-4001", side: "YES", price: 0.55, shares: 65, time: "12:33" },
      { id: "t-4002", side: "NO", price: 0.45, shares: 55, time: "11:58" },
      { id: "t-4003", side: "YES", price: 0.54, shares: 40, time: "11:12" }
    ]
  },
  {
    id: "market-sauti-sol-sellout-kasarani",
    slug: "sauti-sol-sellout-kasarani",
    category: "Culture",
    status: "Open",
    question: "Will Sauti Sol sell out the announced Kasarani show before opening night?",
    shortLabel: "Sauti Sol sell out Kasarani?",
    summary:
      "A culture market tracking whether the promoted Kasarani concert reaches official sold-out status before opening night.",
    region: "Kenya Culture",
    yesPrice: 0.73,
    noPrice: 0.27,
    volumeKes: 312000,
    liquidityKes: 121000,
    closesAt: "2026-08-21T20:00:00+03:00",
    resolutionSource: "Official promoter announcement and ticketing platform status.",
    ruleHighlights: [
      "Resolves YES only if the official promoter or ticketing partner confirms sold-out status before opening night.",
      "Social media rumors or unofficial reseller activity do not count.",
      "If the show is postponed, resolution follows the updated official terms."
    ],
    trustNotes: [
      "Entertainment markets use named official promoter or ticketing sources.",
      "Material schedule changes trigger market notices and, where needed, pause states.",
      "Users can review the evidence link used for settlement after resolution."
    ],
    orderBook: {
      yesBids: [
        { price: 0.72, shares: 260 },
        { price: 0.71, shares: 345 },
        { price: 0.69, shares: 410 }
      ],
      noBids: [
        { price: 0.28, shares: 150 },
        { price: 0.29, shares: 200 },
        { price: 0.31, shares: 275 }
      ]
    },
    trades: [
      { id: "t-5001", side: "YES", price: 0.73, shares: 110, time: "16:11" },
      { id: "t-5002", side: "YES", price: 0.72, shares: 90, time: "15:32" },
      { id: "t-5003", side: "NO", price: 0.28, shares: 60, time: "14:48" }
    ]
  }
];

export const featuredMarkets = markets.slice(0, 3);
export const endingSoonMarkets = markets.filter((market) => market.status === "Closing Soon");
export const kenyaPulseMarkets = markets.filter((market) =>
  ["Politics", "Football", "Economy"].includes(market.category)
);

export function getMarketBySlug(slug: string) {
  return markets.find((market) => market.slug === slug);
}

export function formatKes(value: number) {
  const hasFractionalAmount = Math.abs(value % 1) > 0.001;
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: hasFractionalAmount ? 2 : 0,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatClosingLabel(closesAt: string) {
  return new Intl.DateTimeFormat("en-KE", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Nairobi"
  }).format(new Date(closesAt));
}
