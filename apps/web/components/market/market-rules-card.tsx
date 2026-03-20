type MarketRulesCardProps = {
  title: string;
  items: string[];
};

export function MarketRulesCard({ title, items }: MarketRulesCardProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <span className="market-chip">{title === "How this market resolves" ? "Trust" : "Policy"}</span>
        <strong>{title}</strong>
      </div>
      <ul className="bullet-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
