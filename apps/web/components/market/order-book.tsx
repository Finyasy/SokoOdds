import type { OrderBookLevel, TradePrint } from "@/lib/mock-data";

type OrderBookProps = {
  yesBids: OrderBookLevel[];
  noBids: OrderBookLevel[];
  trades?: TradePrint[];
  showHeader?: boolean;
  compact?: boolean;
};

function OrderBookColumn({
  title,
  levels,
  tone
}: {
  title: string;
  levels: OrderBookLevel[];
  tone: "yes" | "no";
}) {
  const maxShares = Math.max(...levels.map((level) => level.shares), 1);

  return (
    <div className="order-book__column">
      <div className="order-book__title-row">
        <h3>{title}</h3>
        <span className={`order-book__tone order-book__tone--${tone}`}>{title.split(" ")[0]}</span>
      </div>
      <div className="order-book__table">
        <div className="order-book__head">
          <span>Price</span>
          <span>Shares</span>
        </div>
        {levels.map((level) => (
          <div
            key={`${title}-${level.price}-${level.shares}`}
            className={`order-book__row order-book__row--${tone}`}
            style={{ ["--depth" as string]: `${(level.shares / maxShares) * 100}%` }}
          >
            <strong>{Math.round(level.price * 100)} KES</strong>
            <span>{level.shares}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TradeTape({ trades }: { trades: TradePrint[] }) {
  return (
    <div className="trade-tape">
      <div className="trade-tape__head">
        <span>Side</span>
        <span>Price</span>
        <span>Shares</span>
        <span>Time</span>
      </div>
      {trades.map((trade) => (
        <div key={trade.id} className="trade-tape__row">
          <strong className={`trade-side trade-side--${trade.side.toLowerCase()}`}>{trade.side}</strong>
          <span>{Math.round(trade.price * 100)} KES</span>
          <span>{trade.shares}</span>
          <span>{trade.time}</span>
        </div>
      ))}
    </div>
  );
}

export function OrderBook({
  yesBids,
  noBids,
  trades = [],
  showHeader = true,
  compact = false
}: OrderBookProps) {
  return (
    <section className={showHeader ? "panel" : undefined}>
      {showHeader ? (
        <div className="panel__header">
          <span className="market-chip">Realtime surface</span>
          <strong>Order book</strong>
        </div>
      ) : null}
      <div className={`order-book${compact ? " order-book--compact" : ""}`}>
        <OrderBookColumn title="YES bids" levels={yesBids} tone="yes" />
        <OrderBookColumn title="NO bids" levels={noBids} tone="no" />
      </div>
      {trades.length ? (
        <div className="order-book__tape">
          <div className="order-book__title-row">
            <h3>Recent trades</h3>
            <span className="order-book__tone">Tape</span>
          </div>
          <TradeTape trades={trades} />
        </div>
      ) : null}
    </section>
  );
}
