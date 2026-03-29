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
          {variant === "detail"
            ? [0.2, 0.5, 0.8].map((stop) => {
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
          {comparisonSeries.map((item) => (
            <path
              key={item.label}
              d={buildPath(item.history, width, height, padding)}
              className="probability-chart__line probability-chart__line--comparison"
              style={{ stroke: item.color }}
            />
          ))}
          <path d={path} className="probability-chart__line" />
          <circle
            cx={
              padding +
              ((width - padding * 2) * (safeHistory.length - 1)) /
                Math.max(safeHistory.length - 1, 1)
            }
            cy={
              padding +
              (height - padding * 2) -
              clampProbability(lastPoint.value) * (height - padding * 2)
            }
            r={variant === "detail" ? 5.5 : 4}
            className="probability-chart__point"
          />
        </svg>
      </div>

      {variant === "detail" ? (
        <>
          {comparisonSeries.length ? (
            <div className="probability-chart__legend" aria-hidden="true">
              {comparisonSeries.map((item) => (
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
