import { formatKes } from "@/lib/mock-data";

export function PositionSummaryCard() {
  return (
    <section className="panel">
      <div className="panel__header">
        <span className="market-chip">Portfolio</span>
        <strong>Your sample position</strong>
      </div>
      <div className="stat-list">
        <div>
          <span>Position</span>
          <strong>YES 120 shares</strong>
        </div>
        <div>
          <span>Average entry</span>
          <strong>61 KES</strong>
        </div>
        <div>
          <span>Mark value</span>
          <strong>{formatKes(7440)}</strong>
        </div>
        <div>
          <span>Unrealized P&amp;L</span>
          <strong className="positive-text">+{formatKes(120)}</strong>
        </div>
      </div>
    </section>
  );
}
