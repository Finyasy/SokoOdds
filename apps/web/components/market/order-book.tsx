import type { OrderBookLevel } from "@/lib/mock-data";

type OrderBookProps = {
  yesBids: OrderBookLevel[];
  noBids: OrderBookLevel[];
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
          <div key={`${title}-${level.price}-${level.shares}`} className="order-book__row">
            <strong>{Math.round(level.price * 100)} KES</strong>
            <span>{level.shares}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrderBook({ yesBids, noBids }: OrderBookProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <span className="market-chip">Realtime surface</span>
        <strong>Order book</strong>
      </div>
      <div className="order-book">
        <OrderBookColumn title="YES bids" levels={yesBids} tone="yes" />
        <OrderBookColumn title="NO bids" levels={noBids} tone="no" />
      </div>
    </section>
  );
}
