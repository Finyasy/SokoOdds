import Link from "next/link";

type SokoOddsLogoProps = {
  href?: string;
  subtitle?: string;
  compact?: boolean;
};

type SokoOddsBadgeProps = {
  className?: string;
  alt?: string;
};

export function SokoOddsBadge({
  className = "",
  alt = "SokoOdds lion mark"
}: SokoOddsBadgeProps) {
  const badgeClassName = ["brand-badge", className].filter(Boolean).join(" ");

  return (
    <span className={badgeClassName}>
      <img
        src="/brand/IMG_4649.jpg"
        alt={alt}
        className="brand-badge__image"
        width="1320"
        height="1281"
      />
    </span>
  );
}

export function SokoOddsLogo({ href = "/", subtitle, compact = false }: SokoOddsLogoProps) {
  const content = (
    <>
      <span className={`brand-mark__artwork${compact ? " brand-mark__artwork--compact" : ""}`}>
        <img
          src="/brand/IMG_4649.jpg"
          alt="SokoOdds lion logo"
          className="brand-mark__image"
          width="1320"
          height="1281"
        />
      </span>
      {subtitle ? (
        <span className="brand-mark__copy">
          <small>{subtitle}</small>
        </span>
      ) : null}
    </>
  );

  return (
    <Link href={href} className="brand-mark" aria-label="SokoOdds home">
      {content}
    </Link>
  );
}
