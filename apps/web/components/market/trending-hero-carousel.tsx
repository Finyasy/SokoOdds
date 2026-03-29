"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Market } from "@/lib/mock-data";
import { formatKes, formatPercent } from "@/lib/mock-data";
import { MarketIdentity } from "./market-identity";
import { ProbabilityChart } from "./probability-chart";

const AUTO_ROTATE_MS = 7000;

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m11.5 5.5-4.5 4.5 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M8.5 5.5 13 10l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type TrendingHeroCarouselProps = {
  markets: Market[];
};

export function TrendingHeroCarousel({ markets }: TrendingHeroCarouselProps) {
  const heroMarkets = useMemo(() => markets.slice(0, 4), [markets]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (heroMarkets.length < 2 || isPaused) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % heroMarkets.length);
    }, AUTO_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [heroMarkets.length, isPaused]);

  useEffect(() => {
    setProgressKey((current) => current + 1);
  }, [activeIndex, isPaused]);

  if (!heroMarkets.length) {
    return null;
  }

  const activeMarket = heroMarkets[activeIndex];
  const breakingNews = heroMarkets.filter((_, index) => index !== activeIndex).slice(0, 3);
  const hotTopics = [...new Map(markets.map((market) => [market.category, market])).values()].slice(0, 3);
  const nextMarket = heroMarkets[(activeIndex + 1) % heroMarkets.length];
  const previousMarket = heroMarkets[(activeIndex - 1 + heroMarkets.length) % heroMarkets.length];

  function handleSlideSelect(index: number) {
    setActiveIndex(index);
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % heroMarkets.length);
  }

  function showPrevious() {
    setActiveIndex((current) => (current - 1 + heroMarkets.length) % heroMarkets.length);
  }

  return (
    <section
      className="trending-hero"
      aria-label="Trending markets"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="trending-hero__main">
        <Link
          key={activeMarket.slug}
          href={`/markets/${activeMarket.slug}`}
          className="trending-hero__card trending-hero__card--active"
        >
          <div className="trending-hero__card-head">
            <div className="trending-hero__identity-block">
              <MarketIdentity market={activeMarket} size="lg" />
              <div className="trending-hero__copy">
                <span className="trending-hero__eyebrow">
                  {activeMarket.category} · {activeMarket.region}
                </span>
                <h2>{activeMarket.question}</h2>
              </div>
            </div>
            <span className="status-pill status-pill--open">Trending</span>
          </div>

          <div className="trending-hero__content">
            <div className="trending-hero__market-brief">
              <div className="trending-hero__market-summary">
                <div className="trending-hero__option-row">
                  <span>{activeMarket.boardOptions?.[0]?.label ?? "YES chance"}</span>
                  <strong>{formatPercent(activeMarket.boardOptions?.[0]?.value ?? activeMarket.yesPrice)}</strong>
                </div>
                <p className="trending-hero__market-note">{activeMarket.summary}</p>
              </div>

              <div className="trending-hero__market-volume">
                <span>Volume</span>
                <strong>{formatKes(activeMarket.volumeKes)}</strong>
              </div>

              {activeMarket.heroComments?.length ? (
                <div className="trending-hero__comment-list">
                  {activeMarket.heroComments.slice(0, 2).map((comment) => (
                    <div key={`${activeMarket.slug}-${comment.author}`} className="trending-hero__comment">
                      <strong>{comment.author}</strong>
                      <span>{comment.body}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="trending-hero__visual">
              {activeMarket.artworkPath ? (
                <div className="trending-hero__art-panel" aria-hidden="true">
                  <img
                    src={activeMarket.artworkPath}
                    alt={activeMarket.artworkAlt ?? `${activeMarket.shortLabel} artwork`}
                    className="trending-hero__art-image"
                  />
                </div>
              ) : null}
              <div className="trending-hero__chart-shell">
                <ProbabilityChart
                  history={activeMarket.history}
                  value={activeMarket.yesPrice}
                  variant="detail"
                  series={activeMarket.heroSeries}
                  titleLabel={activeMarket.shortLabel}
                  minimalHeader
                />
              </div>
            </div>
          </div>
        </Link>

        <div className="trending-hero__controls">
          <div className="trending-hero__nav">
            <button
              type="button"
              className="trending-hero__arrow"
              aria-label={`Show previous trending market: ${previousMarket.shortLabel}`}
              onClick={showPrevious}
            >
              <ArrowLeftIcon />
            </button>
            <button
              type="button"
              className="trending-hero__arrow"
              aria-label={`Show next trending market: ${nextMarket.shortLabel}`}
              onClick={showNext}
            >
              <ArrowRightIcon />
            </button>
          </div>
          <div className="trending-hero__dots" aria-label="Trending market slides">
            {heroMarkets.map((market, index) => (
              <button
                key={market.slug}
                type="button"
                className={`trending-hero__dot${index === activeIndex ? " trending-hero__dot--active" : ""}`}
                aria-label={`Show ${market.shortLabel}`}
                onClick={() => handleSlideSelect(index)}
              />
            ))}
          </div>
          <div className="trending-hero__next-links">
            <button
              type="button"
              className="trending-hero__chip trending-hero__chip--subtle"
              onClick={showNext}
            >
              Next: {nextMarket.shortLabel}
            </button>
          </div>
        </div>
        <div className="trending-hero__progress" aria-hidden="true">
          <span
            key={progressKey}
            className={`trending-hero__progress-bar${isPaused ? " trending-hero__progress-bar--paused" : ""}`}
            style={{ animationDuration: `${AUTO_ROTATE_MS}ms` }}
          />
        </div>
      </div>

      <aside className="trending-hero__aside">
        <section className="trending-sidebar-card trending-sidebar-card--quiet">
          <div className="trending-sidebar-card__head">
            <h3>Breaking news</h3>
            <span>Right now</span>
          </div>
          <div className="trending-sidebar-card__list">
            {breakingNews.map((market, index) => (
              <Link key={market.slug} href={`/markets/${market.slug}`} className="trending-sidebar-item">
                <span className="trending-sidebar-item__index">{index + 1}</span>
                <div>
                  <strong>{market.shortLabel}</strong>
                  <span>{market.cardMeta?.[0] ?? `${formatKes(market.volumeKes)} vol.`}</span>
                </div>
                <em>{formatPercent(market.yesPrice)}</em>
              </Link>
            ))}
          </div>
        </section>

        <section className="trending-sidebar-card trending-sidebar-card--quiet">
          <div className="trending-sidebar-card__head">
            <h3>Hot topics</h3>
            <span>By board</span>
          </div>
          <div className="trending-sidebar-card__list">
            {hotTopics.map((market, index) => (
              <Link key={`${market.category}-${market.slug}`} href={`/markets/${market.slug}`} className="trending-sidebar-item">
                <span className="trending-sidebar-item__index">{index + 1}</span>
                <div>
                  <strong>{market.category}</strong>
                  <span>{market.cardMeta?.[0] ?? `${formatKes(market.volumeKes)} today`}</span>
                </div>
                <em>{formatPercent(market.yesPrice)}</em>
              </Link>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}
