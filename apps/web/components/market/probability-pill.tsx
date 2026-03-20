import { formatPercent } from "@/lib/mock-data";

type ProbabilityPillProps = {
  label: "YES" | "NO";
  value: number;
  tone?: "yes" | "no";
};

export function ProbabilityPill({
  label,
  value,
  tone = label === "YES" ? "yes" : "no"
}: ProbabilityPillProps) {
  return (
    <div className={`probability-pill probability-pill--${tone}`}>
      <span>{label}</span>
      <strong>{formatPercent(value)}</strong>
    </div>
  );
}
