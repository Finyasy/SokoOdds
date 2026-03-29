import { formatPercent } from "@/lib/mock-data";

type ProbabilityPillProps = {
  label: string;
  value: number;
  tone?: "yes" | "no";
};

export function ProbabilityPill({
  label,
  value,
  tone = label === "NO" ? "no" : "yes"
}: ProbabilityPillProps) {
  return (
    <div className={`probability-pill probability-pill--${tone}`}>
      <span>{label}</span>
      <strong>{formatPercent(value)}</strong>
    </div>
  );
}
