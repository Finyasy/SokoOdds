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
  },
  {
    id: "market-iebc-chair-approved-october",
    slug: "iebc-chair-approved-before-october",
    category: "Politics",
    status: "Open",
    question: "Will Parliament approve the next IEBC chair nominee before October 31, 2026?",
    shortLabel: "IEBC chair nominee approved before Oct 31?",
    summary:
      "A parliamentary-approval market tracking whether the next chair nominee clears the full approval process before the October deadline.",
    region: "Kenya Politics",
    yesPrice: 0.57,
    noPrice: 0.43,
    volumeKes: 268000,
    liquidityKes: 104000,
    closesAt: "2026-10-31T17:00:00+03:00",
    resolutionSource: "Official National Assembly record and Gazette notice.",
    ruleHighlights: [
      "Resolves YES only after the nominee is formally approved and published through the official process.",
      "Committee recommendation alone does not count.",
      "If the nomination is withdrawn or lapses before approval, the market resolves NO."
    ],
    trustNotes: [
      "Resolution depends on official parliamentary and gazette evidence.",
      "High-sensitivity governance markets may pause near major procedural announcements.",
      "Any disputed interpretation is published alongside the final resolution note."
    ],
    orderBook: {
      yesBids: [
        { price: 0.56, shares: 200 },
        { price: 0.55, shares: 320 },
        { price: 0.53, shares: 405 }
      ],
      noBids: [
        { price: 0.44, shares: 180 },
        { price: 0.45, shares: 260 },
        { price: 0.47, shares: 350 }
      ]
    },
    trades: [
      { id: "t-6001", side: "YES", price: 0.57, shares: 95, time: "13:15" },
      { id: "t-6002", side: "NO", price: 0.43, shares: 60, time: "12:41" },
      { id: "t-6003", side: "YES", price: 0.56, shares: 44, time: "12:08" }
    ]
  },
  {
    id: "market-kenya-police-top-three-fkf",
    slug: "kenya-police-top-three-fkf",
    category: "Football",
    status: "Open",
    question: "Will Kenya Police FC finish in the top three of the 2026 FKF Premier League season?",
    shortLabel: "Kenya Police FC top 3 in FKF?",
    summary:
      "A standings market based on whether Kenya Police FC secures a final top-three finish by the end of the league season.",
    region: "Kenya Football",
    yesPrice: 0.49,
    noPrice: 0.51,
    volumeKes: 287000,
    liquidityKes: 110000,
    closesAt: "2026-09-18T18:00:00+03:00",
    resolutionSource: "Official FKF Premier League final standings.",
    ruleHighlights: [
      "Resolves YES if Kenya Police FC finishes first, second, or third in the final table.",
      "Point deductions or disciplinary decisions count if they are part of the final official table.",
      "If the season ends without an official final table, the market resolves VOID."
    ],
    trustNotes: [
      "Resolution waits for the final published FKF standings.",
      "Table changes from late sanctions can pause settlement until the final official ruling lands.",
      "Sports markets retain a visible rule source and close time near the order ticket."
    ],
    orderBook: {
      yesBids: [
        { price: 0.48, shares: 210 },
        { price: 0.47, shares: 285 },
        { price: 0.45, shares: 360 }
      ],
      noBids: [
        { price: 0.52, shares: 200 },
        { price: 0.53, shares: 270 },
        { price: 0.55, shares: 325 }
      ]
    },
    trades: [
      { id: "t-7001", side: "NO", price: 0.51, shares: 88, time: "16:32" },
      { id: "t-7002", side: "YES", price: 0.49, shares: 74, time: "16:04" },
      { id: "t-7003", side: "NO", price: 0.52, shares: 55, time: "15:17" }
    ]
  },
  {
    id: "market-cbk-cut-rate-september",
    slug: "cbk-cut-rate-before-september-end",
    category: "Economy",
    status: "Open",
    question: "Will the Central Bank of Kenya cut its policy rate before September 30, 2026?",
    shortLabel: "CBK cut rate before Sept 30?",
    summary:
      "A macro policy market tracking whether the Central Bank of Kenya makes a rate cut before the end of September 2026.",
    region: "Kenya Economy",
    yesPrice: 0.46,
    noPrice: 0.54,
    volumeKes: 351000,
    liquidityKes: 140000,
    closesAt: "2026-09-30T18:00:00+03:00",
    resolutionSource: "Official Central Bank of Kenya MPC statement.",
    ruleHighlights: [
      "Resolves YES if the official policy rate is cut by any amount before the deadline.",
      "Forward guidance without an actual rate change does not count.",
      "Emergency MPC action counts if it is official and dated before the deadline."
    ],
    trustNotes: [
      "Resolution uses the official CBK statement only.",
      "Macro-policy markets may see sudden repricing around MPC days and inflation releases.",
      "The market page shows the exact source used for final settlement."
    ],
    orderBook: {
      yesBids: [
        { price: 0.45, shares: 230 },
        { price: 0.44, shares: 310 },
        { price: 0.42, shares: 420 }
      ],
      noBids: [
        { price: 0.55, shares: 205 },
        { price: 0.56, shares: 295 },
        { price: 0.58, shares: 360 }
      ]
    },
    trades: [
      { id: "t-8001", side: "NO", price: 0.54, shares: 105, time: "15:55" },
      { id: "t-8002", side: "YES", price: 0.46, shares: 92, time: "15:06" },
      { id: "t-8003", side: "NO", price: 0.55, shares: 64, time: "14:27" }
    ]
  },
  {
    id: "market-mombasa-heatwave-august",
    slug: "mombasa-heatwave-august",
    category: "Weather",
    status: "Closing Soon",
    question: "Will Mombasa record three consecutive days above 33C before August 31, 2026?",
    shortLabel: "Mombasa 3-day heatwave before Aug 31?",
    summary:
      "A weather threshold market using official daily observations to track a late-August heatwave pattern in Mombasa.",
    region: "Coast Weather",
    yesPrice: 0.34,
    noPrice: 0.66,
    volumeKes: 176000,
    liquidityKes: 82000,
    closesAt: "2026-08-31T18:00:00+03:00",
    resolutionSource: "Kenya Meteorological Department station observations.",
    ruleHighlights: [
      "Resolves YES if official maximum temperatures exceed 33.0C on three consecutive days before the deadline.",
      "Unofficial app-based readings do not count.",
      "If one observation day is revised, the revised official record governs."
    ],
    trustNotes: [
      "Weather thresholds are resolved from the named official station series only.",
      "Closing-soon weather markets can stay open right up to the final observation window.",
      "Settlement notes explain any delayed or corrected observations."
    ],
    orderBook: {
      yesBids: [
        { price: 0.33, shares: 150 },
        { price: 0.32, shares: 210 },
        { price: 0.3, shares: 280 }
      ],
      noBids: [
        { price: 0.67, shares: 165 },
        { price: 0.68, shares: 225 },
        { price: 0.7, shares: 305 }
      ]
    },
    trades: [
      { id: "t-9001", side: "NO", price: 0.66, shares: 70, time: "11:48" },
      { id: "t-9002", side: "YES", price: 0.34, shares: 54, time: "11:13" },
      { id: "t-9003", side: "NO", price: 0.67, shares: 48, time: "10:44" }
    ]
  },
  {
    id: "market-blankets-wine-nairobi-sellout",
    slug: "blankets-wine-nairobi-sellout",
    category: "Culture",
    status: "Open",
    question: "Will the next Blankets & Wine Nairobi edition sell out before gates open?",
    shortLabel: "Blankets & Wine Nairobi sell out?",
    summary:
      "A culture market tracking whether the next Nairobi edition reaches official sold-out status before gates open.",
    region: "Nairobi Culture",
    yesPrice: 0.64,
    noPrice: 0.36,
    volumeKes: 244000,
    liquidityKes: 97000,
    closesAt: "2026-11-07T17:00:00+03:00",
    resolutionSource: "Official event promoter notice and ticketing status page.",
    ruleHighlights: [
      "Resolves YES only if the official promoter or ticketing partner confirms sold out before gates open.",
      "Reseller scarcity or social claims do not count.",
      "If the event is postponed, settlement follows the updated official ticketing terms."
    ],
    trustNotes: [
      "Entertainment markets settle from named official sources only.",
      "Material schedule changes trigger an on-page notice and, when needed, a pause.",
      "Users can review the settlement evidence after the outcome resolves."
    ],
    orderBook: {
      yesBids: [
        { price: 0.63, shares: 190 },
        { price: 0.62, shares: 250 },
        { price: 0.6, shares: 330 }
      ],
      noBids: [
        { price: 0.37, shares: 145 },
        { price: 0.38, shares: 210 },
        { price: 0.4, shares: 265 }
      ]
    },
    trades: [
      { id: "t-10001", side: "YES", price: 0.64, shares: 82, time: "17:04" },
      { id: "t-10002", side: "NO", price: 0.36, shares: 58, time: "16:26" },
      { id: "t-10003", side: "YES", price: 0.63, shares: 46, time: "15:52" }
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
