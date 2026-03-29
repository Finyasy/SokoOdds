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

export type MarketHistoryPoint = {
  label: string;
  value: number;
};

export type MarketBoardOption = {
  label: string;
  value: number;
};

export type MarketHeroComment = {
  author: string;
  body: string;
};

export type MarketChartSeries = {
  label: string;
  value: number;
  color: string;
  history: MarketHistoryPoint[];
};

export type MarketComment = {
  id: string;
  author: string;
  ageLabel: string;
  body: string;
  likes: number;
};

export type TopHolder = {
  id: string;
  name: string;
  side: "YES" | "NO";
  shares: number;
  avgPrice: number;
};

export type MarketActivityItem = {
  id: string;
  label: string;
  detail: string;
  timeLabel: string;
};

export type MarketContextCard = {
  id: string;
  title: string;
  body: string;
  updatedLabel: string;
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
  identity?: {
    primary: string;
    secondary?: string;
    label: string;
    primaryImagePath?: string;
    secondaryImagePath?: string;
    primaryBackground?: string;
    primaryColor?: string;
    secondaryBackground?: string;
    secondaryColor?: string;
  };
  history?: MarketHistoryPoint[];
  boardOptions?: MarketBoardOption[];
  cardMeta?: string[];
  showMiniChart?: boolean;
  artworkPath?: string;
  artworkAlt?: string;
  heroSeries?: MarketChartSeries[];
  heroComments?: MarketHeroComment[];
};

export const markets: Market[] = [
  {
    id: "demo-market-kenya-election",
    slug: "nairobi-governor-bill-sign-before-june",
    category: "Politics",
    status: "Open",
    question: "Will Nairobi sign the urban mobility bill by June 30?",
    shortLabel: "Nairobi mobility bill",
    summary: "Tracks whether the county formally signs the urban mobility bill before the deadline.",
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
    ],
    identity: {
      primary: "NBO",
      secondary: "KE",
      label: "Nairobi county public affairs market",
      primaryImagePath: "/market-icons/nairobi-mobility.svg",
      primaryBackground: "#111827",
      primaryColor: "#ffffff",
      secondaryBackground: "#eef2ff",
      secondaryColor: "#1d4ed8"
    },
    boardOptions: [
      { label: "Sign before June", value: 0.62 },
      { label: "Roll into Q3", value: 0.38 }
    ],
    cardMeta: ["Ksh 486K vol.", "County policy"],
    history: [
      { label: "Apr", value: 0.42 },
      { label: "May", value: 0.46 },
      { label: "Jun", value: 0.51 },
      { label: "Jul", value: 0.49 },
      { label: "Aug", value: 0.58 },
      { label: "Sep", value: 0.62 }
    ]
  },
  {
    id: "market-gor-mahia-finish-above-afc-leopards",
    slug: "gor-mahia-finish-above-afc-leopards",
    category: "Football",
    status: "Open",
    question: "Will Gor Mahia finish above AFC Leopards this season?",
    shortLabel: "Gor Mahia above AFC",
    summary: "Resolves from the final FKF table.",
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
    ],
    identity: {
      primary: "GOR",
      secondary: "AFC",
      label: "Gor Mahia versus AFC Leopards football market",
      primaryImagePath: "/market-icons/gor-mahia.svg",
      secondaryImagePath: "/market-icons/afc-leopards.svg",
      primaryBackground: "#0c7a43",
      primaryColor: "#ffffff",
      secondaryBackground: "#1d4ed8",
      secondaryColor: "#ffffff"
    },
    boardOptions: [
      { label: "Gor above AFC", value: 0.68 },
      { label: "AFC above Gor", value: 0.32 }
    ],
    cardMeta: ["Ksh 731K vol.", "FKF"],
    history: [
      { label: "Jan", value: 0.59 },
      { label: "Feb", value: 0.6 },
      { label: "Mar", value: 0.56 },
      { label: "Apr", value: 0.63 },
      { label: "May", value: 0.66 },
      { label: "Jun", value: 0.68 }
    ]
  },
  {
    id: "market-kes-close-above-135-june",
    slug: "kes-close-above-135-june",
    category: "Economy",
    status: "Closing Soon",
    question: "Will KES close above 135 per USD by June 30?",
    shortLabel: "KES above 135",
    summary: "Uses the official CBK closing rate against the dollar.",
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
    ],
    identity: {
      primary: "KES",
      secondary: "USD",
      label: "Kenya shilling versus US dollar market",
      primaryImagePath: "/market-icons/cbk.svg",
      primaryBackground: "#0b6e4f",
      primaryColor: "#ffffff",
      secondaryBackground: "#e9efff",
      secondaryColor: "#3559e6"
    },
    boardOptions: [
      { label: "Above 135", value: 0.41 },
      { label: "Below 135", value: 0.59 }
    ],
    cardMeta: ["Ksh 392K vol.", "FX"],
    history: [
      { label: "Jan", value: 0.55 },
      { label: "Feb", value: 0.52 },
      { label: "Mar", value: 0.5 },
      { label: "Apr", value: 0.47 },
      { label: "May", value: 0.44 },
      { label: "Jun", value: 0.41 }
    ]
  },
  {
    id: "market-long-rains-above-normal-nakuru",
    slug: "long-rains-above-normal-nakuru",
    category: "Weather",
    status: "Open",
    question: "Will Nakuru record above-normal long rains?",
    shortLabel: "Nakuru long rains",
    summary: "Uses the official county long-rains assessment.",
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
    ],
    identity: {
      primary: "NRK",
      secondary: "RAIN",
      label: "Nakuru rainfall market",
      primaryImagePath: "/market-icons/nakuru-rain.svg",
      primaryBackground: "#115e59",
      primaryColor: "#ffffff",
      secondaryBackground: "#ecfccb",
      secondaryColor: "#3f6212"
    },
    cardMeta: ["Ksh 228K vol.", "Meteo"],
    history: [
      { label: "Jan", value: 0.43 },
      { label: "Feb", value: 0.46 },
      { label: "Mar", value: 0.52 },
      { label: "Apr", value: 0.57 },
      { label: "May", value: 0.53 },
      { label: "Jun", value: 0.55 }
    ]
  },
  {
    id: "market-sauti-sol-sellout-kasarani",
    slug: "sauti-sol-sellout-kasarani",
    category: "Culture",
    status: "Open",
    question: "Will Sauti Sol sell out Kasarani before show night?",
    shortLabel: "Sauti Sol sellout",
    summary: "Resolves from official promoter or ticketing sold-out status.",
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
    ],
    identity: {
      primary: "SS",
      secondary: "LIVE",
      label: "Sauti Sol concert market",
      primaryImagePath: "/market-icons/sauti-sol.svg",
      primaryBackground: "#7c2d12",
      primaryColor: "#ffffff",
      secondaryBackground: "#ffe4e6",
      secondaryColor: "#be123c"
    },
    cardMeta: ["Ksh 312K vol.", "Tickets"],
    history: [
      { label: "Feb", value: 0.48 },
      { label: "Mar", value: 0.53 },
      { label: "Apr", value: 0.58 },
      { label: "May", value: 0.64 },
      { label: "Jun", value: 0.7 },
      { label: "Jul", value: 0.73 }
    ]
  },
  {
    id: "market-iebc-chair-approved-october",
    slug: "iebc-chair-approved-before-october",
    category: "Politics",
    status: "Open",
    question: "Will Parliament approve the next IEBC chair by October 31?",
    shortLabel: "IEBC chair approved",
    summary: "Tracks whether the nominee clears the full approval process in time.",
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
    ],
    identity: {
      primary: "IEBC",
      secondary: "CHAIR",
      label: "IEBC chair approval market",
      primaryImagePath: "/market-icons/iebc.svg",
      primaryBackground: "#14532d",
      primaryColor: "#ffffff",
      secondaryBackground: "#ecfdf5",
      secondaryColor: "#166534"
    },
    boardOptions: [
      { label: "Approved by Oct", value: 0.57 },
      { label: "Not approved", value: 0.43 }
    ],
    cardMeta: ["Ksh 268K vol.", "Parliament"],
    history: [
      { label: "May", value: 0.39 },
      { label: "Jun", value: 0.42 },
      { label: "Jul", value: 0.47 },
      { label: "Aug", value: 0.51 },
      { label: "Sep", value: 0.55 },
      { label: "Oct", value: 0.57 }
    ]
  },
  {
    id: "market-kenya-police-top-three-fkf",
    slug: "kenya-police-top-three-fkf",
    category: "Football",
    status: "Open",
    question: "Will Kenya Police finish top 3 this season?",
    shortLabel: "Kenya Police top 3",
    summary: "Resolves from the final FKF table.",
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
    ],
    identity: {
      primary: "POL",
      secondary: "TOP3",
      label: "Kenya Police FC market",
      primaryImagePath: "/market-icons/kenya-police.svg",
      primaryBackground: "#1d4ed8",
      primaryColor: "#ffffff",
      secondaryBackground: "#eff6ff",
      secondaryColor: "#1d4ed8"
    },
    boardOptions: [
      { label: "Top 3 finish", value: 0.49 },
      { label: "Outside top 3", value: 0.51 }
    ],
    cardMeta: ["Ksh 287K vol.", "FKF"],
    history: [
      { label: "Jan", value: 0.44 },
      { label: "Feb", value: 0.46 },
      { label: "Mar", value: 0.51 },
      { label: "Apr", value: 0.47 },
      { label: "May", value: 0.52 },
      { label: "Jun", value: 0.49 }
    ]
  },
  {
    id: "market-cbk-cut-rate-september",
    slug: "cbk-cut-rate-before-september-end",
    category: "Economy",
    status: "Open",
    question: "Will CBK cut its policy rate by September 30?",
    shortLabel: "CBK rate cut",
    summary: "Resolves from the official MPC statement.",
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
    ],
    identity: {
      primary: "CBK",
      secondary: "MPC",
      label: "Central Bank of Kenya rate decision market",
      primaryImagePath: "/market-icons/cbk.svg",
      primaryBackground: "#0f172a",
      primaryColor: "#ffffff",
      secondaryBackground: "#e2e8f0",
      secondaryColor: "#334155"
    },
    cardMeta: ["Ksh 351K vol.", "Macro"],
    showMiniChart: true,
    artworkPath: "/market-art/cbk-rate.svg",
    artworkAlt: "Abstract Central Bank of Kenya rate board artwork",
    history: [
      { label: "Apr", value: 0.58 },
      { label: "May", value: 0.55 },
      { label: "Jun", value: 0.53 },
      { label: "Jul", value: 0.5 },
      { label: "Aug", value: 0.48 },
      { label: "Sep", value: 0.46 }
    ]
  },
  {
    id: "market-mombasa-heatwave-august",
    slug: "mombasa-heatwave-august",
    category: "Weather",
    status: "Closing Soon",
    question: "Will Mombasa record three straight days above 33C by August 31?",
    shortLabel: "Mombasa heatwave",
    summary: "Uses official station readings for the heatwave threshold.",
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
    ],
    identity: {
      primary: "MBA",
      secondary: "33C",
      label: "Mombasa heatwave market",
      primaryImagePath: "/market-icons/mombasa-heat.svg",
      primaryBackground: "#0f766e",
      primaryColor: "#ffffff",
      secondaryBackground: "#fff7ed",
      secondaryColor: "#c2410c"
    },
    cardMeta: ["Ksh 176K vol.", "Weather"],
    history: [
      { label: "Mar", value: 0.52 },
      { label: "Apr", value: 0.48 },
      { label: "May", value: 0.43 },
      { label: "Jun", value: 0.4 },
      { label: "Jul", value: 0.37 },
      { label: "Aug", value: 0.34 }
    ]
  },
  {
    id: "market-blankets-wine-nairobi-sellout",
    slug: "blankets-wine-nairobi-sellout",
    category: "Culture",
    status: "Open",
    question: "Will Blankets & Wine Nairobi sell out before gates open?",
    shortLabel: "Blankets & Wine sellout",
    summary: "Resolves from official promoter or ticketing status.",
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
    ],
    identity: {
      primary: "B&W",
      secondary: "NBO",
      label: "Blankets and Wine Nairobi market",
      primaryImagePath: "/market-icons/blankets-wine.svg",
      primaryBackground: "#6b21a8",
      primaryColor: "#ffffff",
      secondaryBackground: "#fdf2f8",
      secondaryColor: "#be185d"
    },
    cardMeta: ["Ksh 244K vol.", "Events"],
    history: [
      { label: "May", value: 0.41 },
      { label: "Jun", value: 0.45 },
      { label: "Jul", value: 0.49 },
      { label: "Aug", value: 0.55 },
      { label: "Sep", value: 0.6 },
      { label: "Oct", value: 0.64 }
    ]
  },
  {
    id: "market-bitcoin-above-110k-april",
    slug: "bitcoin-above-110k-by-april-end",
    category: "Economy",
    status: "Open",
    question: "Will Bitcoin trade above $110K by April 30?",
    shortLabel: "BTC above 110K",
    summary: "Tracks whether BTC prints above the threshold before deadline.",
    region: "Global Crypto",
    yesPrice: 0.52,
    noPrice: 0.48,
    volumeKes: 941000,
    liquidityKes: 320000,
    closesAt: "2026-04-30T23:00:00+03:00",
    resolutionSource: "Named exchange reference price at any time before the deadline.",
    ruleHighlights: [
      "Resolves YES if BTC trades above $110,000 on the named reference exchange before the deadline.",
      "Momentary prints count if they are reflected in the official exchange trade history.",
      "If exchange data is unavailable, the market resolves from the named backup pricing source."
    ],
    trustNotes: [
      "Crypto markets show the exact pricing source before trade.",
      "Fast markets may move sharply around macro releases and ETF headlines.",
      "Settlement evidence is published after resolution."
    ],
    orderBook: {
      yesBids: [
        { price: 0.51, shares: 560 },
        { price: 0.5, shares: 720 },
        { price: 0.48, shares: 810 }
      ],
      noBids: [
        { price: 0.49, shares: 510 },
        { price: 0.5, shares: 665 },
        { price: 0.52, shares: 790 }
      ]
    },
    trades: [
      { id: "t-11001", side: "YES", price: 0.52, shares: 144, time: "17:10" },
      { id: "t-11002", side: "NO", price: 0.48, shares: 122, time: "16:57" },
      { id: "t-11003", side: "YES", price: 0.51, shares: 98, time: "16:41" }
    ],
    identity: {
      primary: "BTC",
      secondary: "$110K",
      label: "Bitcoin threshold market",
      primaryImagePath: "/market-icons/bitcoin.svg",
      primaryBackground: "#f7931a",
      primaryColor: "#ffffff",
      secondaryBackground: "#fff7ed",
      secondaryColor: "#c2410c"
    },
    boardOptions: [
      { label: "Above 110K", value: 0.52 },
      { label: "Below 110K", value: 0.48 }
    ],
    cardMeta: ["Ksh 941K vol.", "Crypto"],
    showMiniChart: true,
    artworkPath: "/market-art/bitcoin-trend.svg",
    artworkAlt: "Abstract Bitcoin market artwork",
    history: [
      { label: "Mon", value: 0.36 },
      { label: "Tue", value: 0.42 },
      { label: "Wed", value: 0.39 },
      { label: "Thu", value: 0.49 },
      { label: "Fri", value: 0.46 },
      { label: "Now", value: 0.52 }
    ],
    heroSeries: [
      {
        label: "Above 110K",
        value: 0.52,
        color: "#6ea8ff",
        history: [
          { label: "Mar 5", value: 0.34 },
          { label: "Mar 9", value: 0.46 },
          { label: "Mar 12", value: 0.41 },
          { label: "Mar 15", value: 0.59 },
          { label: "Mar 18", value: 0.48 },
          { label: "Now", value: 0.52 }
        ]
      },
      {
        label: "Above 105K",
        value: 0.71,
        color: "#3559e6",
        history: [
          { label: "Mar 5", value: 0.52 },
          { label: "Mar 9", value: 0.64 },
          { label: "Mar 12", value: 0.59 },
          { label: "Mar 15", value: 0.77 },
          { label: "Mar 18", value: 0.66 },
          { label: "Now", value: 0.71 }
        ]
      }
    ],
    heroComments: [
      {
        author: "CoinDeskKE",
        body: "ETF headlines keep this market moving around the US open."
      },
      {
        author: "WestlandsMacro",
        body: "One of the cleanest momentum charts on the board."
      }
    ]
  },
  {
    id: "market-nse-20-share-above-4700",
    slug: "nse-20-share-above-4700-by-quarter-end",
    category: "Economy",
    status: "Open",
    question: "Will the NSE 20 close above 4,700 by quarter end?",
    shortLabel: "NSE 20 above 4700",
    summary: "Uses the official NSE 20 closing print at quarter end.",
    region: "Nairobi Stock Exchange",
    yesPrice: 0.46,
    noPrice: 0.54,
    volumeKes: 517000,
    liquidityKes: 188000,
    closesAt: "2026-06-30T17:00:00+03:00",
    resolutionSource: "Official NSE closing print for the 20 Share Index.",
    ruleHighlights: [
      "Resolves YES if the official quarter-end close is above 4,700.",
      "Intraday moves do not count.",
      "Exchange corrections use the revised official close."
    ],
    trustNotes: [
      "NSE markets always reference the named official closing print.",
      "Corporate action-heavy weeks may create sharper repricing across board names.",
      "The market page keeps the settlement source visible next to the ticket."
    ],
    orderBook: {
      yesBids: [
        { price: 0.45, shares: 360 },
        { price: 0.44, shares: 420 },
        { price: 0.42, shares: 505 }
      ],
      noBids: [
        { price: 0.55, shares: 310 },
        { price: 0.56, shares: 390 },
        { price: 0.58, shares: 460 }
      ]
    },
    trades: [
      { id: "t-12001", side: "NO", price: 0.54, shares: 133, time: "15:29" },
      { id: "t-12002", side: "YES", price: 0.46, shares: 115, time: "15:02" },
      { id: "t-12003", side: "YES", price: 0.45, shares: 91, time: "14:46" }
    ],
    identity: {
      primary: "NSE",
      secondary: "20",
      label: "Nairobi Stock Exchange benchmark market",
      primaryImagePath: "/market-icons/nse.svg",
      primaryBackground: "#0f766e",
      primaryColor: "#ffffff",
      secondaryBackground: "#ecfeff",
      secondaryColor: "#155e75"
    },
    boardOptions: [
      { label: "Above 4700", value: 0.46 },
      { label: "Below 4700", value: 0.54 }
    ],
    cardMeta: ["Ksh 517K vol.", "NSE"],
    showMiniChart: true,
    artworkPath: "/market-art/nse-board.svg",
    artworkAlt: "Abstract Nairobi Stock Exchange market artwork",
    history: [
      { label: "Jan", value: 0.38 },
      { label: "Feb", value: 0.41 },
      { label: "Mar", value: 0.44 },
      { label: "Apr", value: 0.47 },
      { label: "May", value: 0.45 },
      { label: "Now", value: 0.46 }
    ],
    heroSeries: [
      {
        label: "Above 4700",
        value: 0.46,
        color: "#6ea8ff",
        history: [
          { label: "Jan", value: 0.38 },
          { label: "Feb", value: 0.41 },
          { label: "Mar", value: 0.44 },
          { label: "Apr", value: 0.47 },
          { label: "May", value: 0.45 },
          { label: "Now", value: 0.46 }
        ]
      },
      {
        label: "Above 4500",
        value: 0.73,
        color: "#3559e6",
        history: [
          { label: "Jan", value: 0.61 },
          { label: "Feb", value: 0.64 },
          { label: "Mar", value: 0.68 },
          { label: "Apr", value: 0.72 },
          { label: "May", value: 0.7 },
          { label: "Now", value: 0.73 }
        ]
      }
    ],
    heroComments: [
      {
        author: "UpperHillDesk",
        body: "Banks and telcos are doing most of the work in this index market."
      },
      {
        author: "KilimaniFlow",
        body: "NSE markets read cleanly when the close print is the whole story."
      }
    ]
  },
  {
    id: "market-crude-oil-above-100-april",
    slug: "crude-oil-above-100-by-april-end",
    category: "Economy",
    status: "Closing Soon",
    question: "Will crude oil hit $100 by April 30?",
    shortLabel: "Crude oil 100",
    summary: "Tracks whether the named crude benchmark prints at or above $100.",
    region: "Energy",
    yesPrice: 0.44,
    noPrice: 0.56,
    volumeKes: 608000,
    liquidityKes: 212000,
    closesAt: "2026-04-30T23:00:00+03:00",
    resolutionSource: "Named NYMEX crude oil reference print.",
    ruleHighlights: [
      "Resolves YES if the named crude oil benchmark trades at or above $100 before the deadline.",
      "The market uses the benchmark series stated on the market page, not a generic news quote.",
      "If the source provider revises the final print, the revised official print governs."
    ],
    trustNotes: [
      "Energy markets carry the benchmark source before trade.",
      "Fast macro and geopolitical headlines can create sharp intraday swings in the probability curve.",
      "Resolution notes link to the exact oil print used for settlement."
    ],
    orderBook: {
      yesBids: [
        { price: 0.43, shares: 285 },
        { price: 0.42, shares: 340 },
        { price: 0.4, shares: 430 }
      ],
      noBids: [
        { price: 0.57, shares: 295 },
        { price: 0.58, shares: 365 },
        { price: 0.6, shares: 430 }
      ]
    },
    trades: [
      { id: "t-13001", side: "NO", price: 0.56, shares: 138, time: "17:18" },
      { id: "t-13002", side: "YES", price: 0.44, shares: 102, time: "16:48" },
      { id: "t-13003", side: "NO", price: 0.57, shares: 84, time: "16:21" }
    ],
    identity: {
      primary: "CL",
      secondary: "$100",
      label: "Crude oil threshold market",
      primaryImagePath: "/market-icons/crude-oil.svg",
      primaryBackground: "#18181b",
      primaryColor: "#ffffff",
      secondaryBackground: "#fef3c7",
      secondaryColor: "#92400e"
    },
    boardOptions: [
      { label: "Hit 100", value: 0.44 },
      { label: "Stay below 100", value: 0.56 }
    ],
    cardMeta: ["Ksh 608K vol.", "Oil"],
    artworkPath: "/market-art/crude-oil-wave.svg",
    artworkAlt: "Abstract crude oil market artwork",
    history: [
      { label: "Mar 5", value: 0.24 },
      { label: "Mar 9", value: 0.36 },
      { label: "Mar 12", value: 0.32 },
      { label: "Mar 15", value: 0.49 },
      { label: "Mar 18", value: 0.42 },
      { label: "Now", value: 0.44 }
    ],
    heroSeries: [
      {
        label: "Hit 100",
        value: 0.44,
        color: "#6ea8ff",
        history: [
          { label: "Mar 5", value: 0.24 },
          { label: "Mar 9", value: 0.36 },
          { label: "Mar 12", value: 0.32 },
          { label: "Mar 15", value: 0.49 },
          { label: "Mar 18", value: 0.42 },
          { label: "Now", value: 0.44 }
        ]
      },
      {
        label: "Above 95",
        value: 0.66,
        color: "#3559e6",
        history: [
          { label: "Mar 5", value: 0.48 },
          { label: "Mar 9", value: 0.58 },
          { label: "Mar 12", value: 0.55 },
          { label: "Mar 15", value: 0.71 },
          { label: "Mar 18", value: 0.63 },
          { label: "Now", value: 0.66 }
        ]
      },
      {
        label: "Below 90",
        value: 0.18,
        color: "#f59e0b",
        history: [
          { label: "Mar 5", value: 0.09 },
          { label: "Mar 9", value: 0.11 },
          { label: "Mar 12", value: 0.14 },
          { label: "Mar 15", value: 0.18 },
          { label: "Mar 18", value: 0.16 },
          { label: "Now", value: 0.18 }
        ]
      }
    ],
    heroComments: [
      {
        author: "EnergyTape",
        body: "This trades like a live macro board when supply headlines hit."
      },
      {
        author: "WestlandsMacro",
        body: "The multi-band view makes oil thresholds easier to scan."
      }
    ]
  }
];

export const featuredMarkets = markets.slice(0, 3);
export const endingSoonMarkets = markets.filter((market) => market.status === "Closing Soon");
export const kenyaPulseMarkets = markets.filter((market) =>
  ["Politics", "Football", "Economy"].includes(market.category)
);
export const homeHeroMarkets = [
  "bitcoin-above-110k-by-april-end",
  "nse-20-share-above-4700-by-quarter-end",
  "crude-oil-above-100-by-april-end",
  "cbk-cut-rate-before-september-end"
]
  .map((slug) => markets.find((market) => market.slug === slug))
  .filter((market): market is Market => Boolean(market));

export function getMarketBySlug(slug: string) {
  return markets.find((market) => market.slug === slug);
}

export function getRelatedMarketsForMarket(market: Market, limit = 3) {
  return markets
    .filter((candidate) => candidate.slug !== market.slug)
    .sort((left, right) => {
      const leftScore = Number(left.category === market.category) * 10 + left.volumeKes;
      const rightScore = Number(right.category === market.category) * 10 + right.volumeKes;
      return rightScore - leftScore;
    })
    .slice(0, limit);
}

export function getMarketComments(market: Market): MarketComment[] {
  const commentsByCategory: Record<MarketCategory, MarketComment[]> = {
    Politics: [
      {
        id: `${market.id}-comment-1`,
        author: "NairobiWatch",
        ageLabel: "56m ago",
        body: "County notice is the whole game here. Speeches and TV clips should not move this price that much.",
        likes: 8
      },
      {
        id: `${market.id}-comment-2`,
        author: "MzalendoDesk",
        ageLabel: "2h ago",
        body: "If this slips into another sitting window, YES probably cools fast.",
        likes: 4
      },
      {
        id: `${market.id}-comment-3`,
        author: "WestlandsMacro",
        ageLabel: "4h ago",
        body: "Governance markets work better when the source is this explicit. Less arguing later.",
        likes: 11
      }
    ],
    Football: [
      {
        id: `${market.id}-comment-1`,
        author: "FKFTracker",
        ageLabel: "44m ago",
        body: "Form is moving quickly. One bad week and this price can swing hard.",
        likes: 6
      },
      {
        id: `${market.id}-comment-2`,
        author: "TuskerTape",
        ageLabel: "3h ago",
        body: "As long as this resolves from the final table, even casual users will get it.",
        likes: 3
      },
      {
        id: `${market.id}-comment-3`,
        author: "GoalMath",
        ageLabel: "6h ago",
        body: "I like league markets when the tie-break rule is already settled before the drama starts.",
        likes: 9
      }
    ],
    Economy: [
      {
        id: `${market.id}-comment-1`,
        author: "KESFlow",
        ageLabel: "39m ago",
        body: "Serious money will wait for the official release, not headline noise. Good rule set here.",
        likes: 7
      },
      {
        id: `${market.id}-comment-2`,
        author: "CBKWatcher",
        ageLabel: "1h ago",
        body: "Clean threshold, clean timing. Easy market to explain and easier to price.",
        likes: 5
      },
      {
        id: `${market.id}-comment-3`,
        author: "MadarakaDesk",
        ageLabel: "5h ago",
        body: "Macro stories need more chart context. Last tick alone never tells the full story.",
        likes: 10
      }
    ],
    Weather: [
      {
        id: `${market.id}-comment-1`,
        author: "RainGaugeKE",
        ageLabel: "1h ago",
        body: "Weather takes patience, but the official source keeps this honest.",
        likes: 2
      },
      {
        id: `${market.id}-comment-2`,
        author: "CountyForecast",
        ageLabel: "3h ago",
        body: "County wording is the key here. App screenshots should not shift settlement expectations.",
        likes: 4
      },
      {
        id: `${market.id}-comment-3`,
        author: "StormTape",
        ageLabel: "7h ago",
        body: "Quiet now, but weather markets can jump right near the last observation window.",
        likes: 3
      }
    ],
    Culture: [
      {
        id: `${market.id}-comment-1`,
        author: "NairobiNights",
        ageLabel: "28m ago",
        body: "Official ticketing page is what matters here. Sellout rumors should not settle anything.",
        likes: 6
      },
      {
        id: `${market.id}-comment-2`,
        author: "StageLeftKE",
        ageLabel: "2h ago",
        body: "Fun market, and the wording is clear enough that first-timers will know what they are buying.",
        likes: 5
      },
      {
        id: `${market.id}-comment-3`,
        author: "HypeMeter",
        ageLabel: "4h ago",
        body: "You can feel YES lift when promo picks up, but I like that the rule stays black and white.",
        likes: 8
      }
    ]
  };

  return commentsByCategory[market.category];
}

export function getMarketTopHolders(market: Market): TopHolder[] {
  const basePrice = Math.round(market.yesPrice * 100);
  const holdersByCategory: Record<MarketCategory, [string, string, string]> = {
    Politics: ["Upper Hill Desk", "Mzalendo Flow", "City Hall Tape"],
    Football: ["GoalLine KE", "Ngong Road XI", "Stadium Tape"],
    Economy: ["Kilimani Macro", "Treasury Desk", "FX Flow KE"],
    Weather: ["County Rain Desk", "Forecast Tape", "Lake Basin Watch"],
    Culture: ["Ticket Desk KE", "Nairobi Nights", "Stage Door Flow"]
  };
  const [firstHolder, secondHolder, thirdHolder] = holdersByCategory[market.category];

  return [
    {
      id: `${market.id}-holder-1`,
      name: firstHolder,
      side: "YES",
      shares: 820,
      avgPrice: basePrice - 4
    },
    {
      id: `${market.id}-holder-2`,
      name: secondHolder,
      side: market.noPrice > market.yesPrice ? "NO" : "YES",
      shares: 610,
      avgPrice: market.noPrice > market.yesPrice ? Math.round(market.noPrice * 100) - 3 : basePrice - 2
    },
    {
      id: `${market.id}-holder-3`,
      name: thirdHolder,
      side: "NO",
      shares: 480,
      avgPrice: Math.round(market.noPrice * 100) - 2
    }
  ];
}

export function getMarketActivity(market: Market): MarketActivityItem[] {
  const openLabels: Record<MarketCategory, string> = {
    Politics: "Policy market opened",
    Football: "Fixture market opened",
    Economy: "Macro market opened",
    Weather: "Weather market opened",
    Culture: "Event market opened"
  };

  const ruleLabels: Record<MarketCategory, string> = {
    Politics: "Source note pinned",
    Football: "Table rule pinned",
    Economy: "Threshold rule pinned",
    Weather: "Observation rule pinned",
    Culture: "Ticketing rule pinned"
  };

  const tradeLabels: Record<MarketCategory, string> = {
    Politics: "Large governance trade",
    Football: "League trade matched",
    Economy: "Macro trade matched",
    Weather: "Weather trade matched",
    Culture: "Event trade matched"
  };

  return [
    {
      id: `${market.id}-activity-1`,
      label: openLabels[market.category],
      detail: `Opening YES price was near ${Math.round(market.yesPrice * 100) - 6} KES.`,
      timeLabel: "Today · 9:05"
    },
    {
      id: `${market.id}-activity-2`,
      label: ruleLabels[market.category],
      detail: market.ruleHighlights[0],
      timeLabel: "Today · 10:14"
    },
    {
      id: `${market.id}-activity-3`,
      label: tradeLabels[market.category],
      detail: `${market.trades[0]?.shares ?? 0} shares matched at ${Math.round(
        (market.trades[0]?.price ?? market.yesPrice) * 100
      )} KES.`,
      timeLabel: `Today · ${market.trades[0]?.time ?? "14:00"}`
    }
  ];
}

export function getMarketContextCards(market: Market): MarketContextCard[] {
  return [
    {
      id: `${market.id}-context-1`,
      title: "Additional context",
      body: market.ruleHighlights[0],
      updatedLabel: "Updated today"
    },
    {
      id: `${market.id}-context-2`,
      title: "What traders are watching",
      body: market.trustNotes[1] ?? market.trustNotes[0],
      updatedLabel: "Reviewed this afternoon"
    }
  ];
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
