import {
  formatPercent,
  type MarketChartSeries,
  type MarketHistoryPoint
} from "@/lib/mock-data";

type ProbabilityChartProps = {
  history?: MarketHistoryPoint[];
  value: number;
  variant?: "card" | "detail";
  series?: MarketChartSeries[];
  titleLabel?: string;
  minimalHeader?: boolean;
};

function clampProbability(value: number) {
  return Math.max(0, Math.min(1, value));
}

function buildChartId(seed: string) {
  return seed.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function buildPath(history: MarketHistoryPoint[], width: number, height: number, padding: number) {
  if (history.length === 0) {
    return "";
  }

  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  return history
    .map((point, index) => {
      const x = padding + (innerWidth * index) / Math.max(history.length - 1, 1);
      const y = padding + innerHeight - clampProbability(point.value) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function buildAreaPath(
  history: MarketHistoryPoint[],
  width: number,
  height: number,
  padding: number
) {
  if (history.length === 0) {
    return "";
  }

  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const linePath = buildPath(history, width, height, padding);
  const lastX = padding + innerWidth;
  const baselineY = padding + innerHeight;

  return `${linePath} L ${lastX} ${baselineY} L ${padding} ${baselineY} Z`;
}

function buildSyntheticDetailSeries(
  safeHistory: MarketHistoryPoint[],
  value: number
): MarketChartSeries[] {
  if (safeHistory.length < 3) {
    return [];
  }

  const upper = safeHistory.map((point, index) => ({
    label: point.label,
    value: clampProbability(point.value + 0.08 - index * 0.005 + Math.sin(index * 1.4) * 0.025)
  }));
  const lower = safeHistory.map((point, index) => ({
    label: point.label,
    value: clampProbability(point.value - 0.14 + index * 0.004 - Math.cos(index * 1.3) * 0.02)
  }));

  return [
    {
      label: "Bull case",
      value: clampProbability(value + 0.08),
      color: "#79a8ff",
      history: upper
    },
    {
      label: "Bear case",
      value: clampProbability(value - 0.12),
      color: "#f0af43",
      history: lower
    }
  ];
}

export function ProbabilityChart({
  history,
  value,
  variant = "card",
  series,
  titleLabel,
  minimalHeader = false
}: ProbabilityChartProps) {
  const safeHistory =
    history && history.length
      ? history
      : [
          { label: "Start", value: Math.max(0.04, value - 0.08) },
          { label: "Now", value }
        ];
  const width = variant === "detail" ? 640 : 320;
  const height = variant === "detail" ? 220 : 92;
  const padding = variant === "detail" ? 18 : 10;
  const path = buildPath(safeHistory, width, height, padding);
  const comparisonSeries = series?.filter((item) => item.history.length) ?? [];
  const richSeries =
    variant === "detail" && comparisonSeries.length === 0
      ? buildSyntheticDetailSeries(safeHistory, value)
      : comparisonSeries;
  const lastPoint = safeHistory[safeHistory.length - 1] ?? { label: "", value };
  const firstPoint = safeHistory[0] ?? lastPoint;
  const delta = Math.round((lastPoint.value - firstPoint.value) * 100);
  const deltaLabel =
    delta === 0 ? "Flat" : delta > 0 ? `Up ${delta}%` : `Down ${Math.abs(delta)}%`;
  const labels =
    safeHistory.length >= 3
      ? [
          safeHistory[0]?.label,
          safeHistory[Math.floor(safeHistory.length / 2)]?.label,
          safeHistory[safeHistory.length - 1]?.label
        ]
      : safeHistory.map((point) => point.label);
  const chartId = buildChartId(titleLabel ?? `market-${lastPoint.label}-${Math.round(value * 100)}`);
  const rightAxisStops = [1, 0.75, 0.5, 0.25, 0];
  const lastX =
    padding +
    ((width - padding * 2) * (safeHistory.length - 1)) / Math.max(safeHistory.length - 1, 1);
  const lastY =
    padding +
    (height - padding * 2) -
    clampProbability(lastPoint.value) * (height - padding * 2);
  const referenceY = padding + (height - padding * 2) * 0.5;
  const baselineY = height - padding;

  return (
    <div className={`probability-chart probability-chart--${variant}`}>
      {variant === "detail" ? (
        <div className="probability-chart__header">
          <div className="probability-chart__title">
            <span className="section-kicker">Price history</span>
            <strong>{titleLabel ?? `${formatPercent(value)} YES chance`}</strong>
          </div>
          <div className="probability-chart__meta">
            <span className="probability-chart__delta">{deltaLabel}</span>
            {minimalHeader ? null : (
              <div className="probability-chart__range">
                <span>1W</span>
                <span>1M</span>
                <span className="probability-chart__range-active">ALL</span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="probability-chart__frame">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Probability chart ending at ${formatPercent(value)} YES`}
        >
          <defs>
            <linearGradient id={`chart-fill-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(37, 83, 235, 0.34)" />
              <stop offset="100%" stopColor="rgba(37, 83, 235, 0.02)" />
            </linearGradient>
            <linearGradient id={`chart-glow-${chartId}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(37, 83, 235, 0)" />
              <stop offset="55%" stopColor="rgba(37, 83, 235, 0.08)" />
              <stop offset="100%" stopColor="rgba(37, 83, 235, 0.18)" />
            </linearGradient>
          </defs>
          {variant === "detail"
            ? [0.2, 0.35, 0.5, 0.65, 0.8].map((stop) => {
                const y = padding + (height - padding * 2) * stop;
                return (
                  <line
                    key={stop}
                    x1={padding}
                    y1={y}
                    x2={width - padding}
                    y2={y}
                    className="probability-chart__guide"
                  />
                );
              })
            : null}
          {variant === "detail" ? (
            <line
              x1={padding}
              y1={referenceY}
              x2={width - padding}
              y2={referenceY}
              className="probability-chart__reference"
            />
          ) : null}
          {variant === "detail" ? (
            <rect
              x={padding}
              y={padding}
              width={Math.max(lastX - padding, 0)}
              height={height - padding * 2}
              fill={`url(#chart-glow-${chartId})`}
              className="probability-chart__progress-fill"
            />
          ) : null}
          <path
            d={buildAreaPath(safeHistory, width, height, padding)}
            className="probability-chart__area"
            style={{ fill: `url(#chart-fill-${chartId})` }}
          />
          {richSeries.map((item) => (
            <path
              key={item.label}
              d={buildPath(item.history, width, height, padding)}
              className="probability-chart__line probability-chart__line--comparison"
              style={{ stroke: item.color }}
            />
          ))}
          <path d={path} className="probability-chart__line" />
          {variant === "detail" ? (
            <>
              <line
                x1={lastX}
                y1={padding}
                x2={lastX}
                y2={baselineY}
                className="probability-chart__cursor"
              />
              <line
                x1={padding}
                y1={lastY}
                x2={width - padding}
                y2={lastY}
                className="probability-chart__last-line"
              />
              <rect
                x={Math.max(lastX - 30, padding)}
                y={Math.max(lastY - 34, padding + 6)}
                rx={12}
                width="60"
                height="24"
                className="probability-chart__tooltip"
              />
              <text
                x={lastX}
                y={Math.max(lastY - 18, padding + 21)}
                textAnchor="middle"
                className="probability-chart__tooltip-text"
              >
                {formatPercent(lastPoint.value)}
              </text>
            </>
          ) : null}
          <circle
            cx={lastX}
            cy={lastY}
            r={variant === "detail" ? 5.5 : 4}
            className="probability-chart__point"
          />
          {variant === "detail"
            ? rightAxisStops.map((stop) => {
                const y = padding + (height - padding * 2) * (1 - stop);
                return (
                  <text
                    key={stop}
                    x={width - 2}
                    y={y + 4}
                    textAnchor="end"
                    className="probability-chart__axis-label"
                  >
                    {Math.round(stop * 100)}%
                  </text>
                );
              })
            : null}
        </svg>
      </div>

      {variant === "detail" ? (
        <>
          {richSeries.length ? (
            <div className="probability-chart__legend" aria-hidden="true">
              {richSeries.map((item) => (
                <span key={item.label} className="probability-chart__legend-item">
                  <i style={{ backgroundColor: item.color }} />
                  {item.label} {formatPercent(item.value)}
                </span>
              ))}
            </div>
          ) : null}
          <div className="probability-chart__labels" aria-hidden="true">
            {labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </>
      ) : (
        <div className="probability-chart__summary" aria-hidden="true">
          <span>{labels[0]}</span>
          <strong>{formatPercent(value)}</strong>
        </div>
      )}
    </div>
  );
}
