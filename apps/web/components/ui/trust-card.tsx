type TrustCardProps = {
  title: string;
  description: string;
};

export function TrustCard({ title, description }: TrustCardProps) {
  return (
    <article className="trust-card">
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}
