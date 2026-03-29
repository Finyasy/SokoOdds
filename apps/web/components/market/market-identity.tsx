import type { Market } from "@/lib/mock-data";

type MarketIdentityProps = {
  market: Market;
  size?: "sm" | "md" | "lg";
};

type IdentityToken = NonNullable<Market["identity"]>;

function getFallbackIdentity(category: Market["category"]): IdentityToken {
  switch (category) {
    case "Politics":
      return {
        primary: "POL",
        secondary: undefined,
        label: "Politics market",
        primaryImagePath: undefined,
        secondaryImagePath: undefined,
        primaryBackground: undefined,
        primaryColor: undefined,
        secondaryBackground: undefined,
        secondaryColor: undefined
      };
    case "Football":
      return {
        primary: "FKF",
        secondary: undefined,
        label: "Football market",
        primaryImagePath: undefined,
        secondaryImagePath: undefined,
        primaryBackground: undefined,
        primaryColor: undefined,
        secondaryBackground: undefined,
        secondaryColor: undefined
      };
    case "Economy":
      return {
        primary: "KES",
        secondary: undefined,
        label: "Economy market",
        primaryImagePath: undefined,
        secondaryImagePath: undefined,
        primaryBackground: undefined,
        primaryColor: undefined,
        secondaryBackground: undefined,
        secondaryColor: undefined
      };
    case "Weather":
      return {
        primary: "MET",
        secondary: undefined,
        label: "Weather market",
        primaryImagePath: undefined,
        secondaryImagePath: undefined,
        primaryBackground: undefined,
        primaryColor: undefined,
        secondaryBackground: undefined,
        secondaryColor: undefined
      };
    case "Culture":
      return {
        primary: "LIVE",
        secondary: undefined,
        label: "Culture market",
        primaryImagePath: undefined,
        secondaryImagePath: undefined,
        primaryBackground: undefined,
        primaryColor: undefined,
        secondaryBackground: undefined,
        secondaryColor: undefined
      };
  }
}

export function MarketIdentity({ market, size = "md" }: MarketIdentityProps) {
  const identity = market.identity ?? getFallbackIdentity(market.category);
  const primaryIsLong = identity.primary.length > 3;
  const secondaryIsLong = Boolean(identity.secondary && identity.secondary.length > 3);

  return (
    <span
      className={`market-identity market-identity--${size}${
        identity.secondary ? " market-identity--dual" : ""
      }`}
      aria-label={identity.label}
      title={identity.label}
    >
      <span
        className={`market-identity__token${primaryIsLong ? " market-identity__token--long" : ""}${
          identity.primaryImagePath ? " market-identity__token--image" : ""
        }`}
        style={{
          background: identity.primaryBackground,
          color: identity.primaryColor
        }}
      >
        {identity.primaryImagePath ? (
          <img
            src={identity.primaryImagePath}
            alt=""
            className="market-identity__image"
            aria-hidden="true"
          />
        ) : (
          identity.primary
        )}
      </span>
      {identity.secondary ? (
        <span
          className={`market-identity__token market-identity__token--secondary${
            secondaryIsLong ? " market-identity__token--long" : ""
          }${identity.secondaryImagePath ? " market-identity__token--image" : ""}`}
          style={{
            background: identity.secondaryBackground,
            color: identity.secondaryColor
          }}
        >
          {identity.secondaryImagePath ? (
            <img
              src={identity.secondaryImagePath}
              alt=""
              className="market-identity__image"
              aria-hidden="true"
            />
          ) : (
            identity.secondary
          )}
        </span>
      ) : null}
    </span>
  );
}
