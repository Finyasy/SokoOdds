import type { TradePrint } from "@/lib/mock-data";

type RecentTradesProps = {
  trades: TradePrint[];
};

export function RecentTrades({ trades }: RecentTradesProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <span className="market-chip">Live tape</span>
        <strong>Recent trades</strong>
      </div>
      <div className="trade-tape">
        <div className="trade-tape__head">
          <span>Side</span>
          <span>Price</span>
          <span>Shares</span>
          <span>Time</span>
        </div>
        {trades.map((trade) => (
          <div key={trade.id} className="trade-tape__row">
            <span className={`trade-side trade-side--${trade.side.toLowerCase()}`}>{trade.side}</span>
            <strong>{Math.round(trade.price * 100)} KES</strong>
            <span>{trade.shares}</span>
            <span>{trade.time}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
