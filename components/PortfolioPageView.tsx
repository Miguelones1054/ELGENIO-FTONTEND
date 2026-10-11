"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { SiteHeader } from "@/components/SiteHeader";
import { useSiteConfig, type PortfolioItem, type PortfolioMedia } from "@/components/SiteConfigProvider";
import { resolveMediaUrl } from "@/lib/env";
import { collectionWorks } from "@/lib/portfolio";
import { extractYouTubeId, getYouTubeEmbedUrl } from "@/lib/youtube";
import strings from "@/assets/strings/string-es.co.json";
import styles from "@/styles/portfolio.module.css";

const page = strings.pages.portafolio;
const ALL = page.allLabel;

function isExternalLink(url: string) {
  return /^https?:\/\//i.test(url) || url.startsWith("//") || url.startsWith("mailto:") || url.startsWith("tel:");
}

function cardSize(index: number) {
  return index % 5 < 2 ? "wide" : "regular";
}

export function PortfolioPageView() {
  const { config } = useSiteConfig();
  const [filter, setFilter] = useState(ALL);
  const [activeCollection, setActiveCollection] = useState<PortfolioItem | null>(null);
  const [slide, setSlide] = useState(0);

  const items = useMemo(() => {
    return (config.portfolio || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [config.portfolio]);

  const categories = useMemo(() => {
    const known = new Set<string>(page.categories);
    for (const item of items) {
      const category = item.category?.trim();
      if (category) known.add(category);
    }
    const extras = [...known].filter((category) => !page.categories.includes(category));
    return [...page.categories, ...extras];
  }, [items]);

  const visibleItems = useMemo(() => {
    if (filter === ALL) return items;
    return items.filter((item) => item.category?.trim().toLowerCase() === filter.toLowerCase());
  }, [filter, items]);

  const cover = config.portfolioCover;
  const heroImage = cover?.imageUrl
    ? resolveMediaUrl(cover.imageUrl)
    : items[0]?.imageUrl
      ? resolveMediaUrl(items[0].imageUrl)
      : "";
  const headline = cover?.headline?.trim() || page.headline;
  const lead = cover?.description?.trim() || page.copy;
  const badge = [cover?.badgeLine1?.trim() || page.badge[0], cover?.badgeLine2?.trim() || page.badge[1]];

  const activeWorks = activeCollection ? collectionWorks(activeCollection) : [];

  function openCollection(item: PortfolioItem) {
    setActiveCollection(item);
    setSlide(0);
  }

  function moveSlide(direction: -1 | 1) {
    if (activeWorks.length < 2) return;
    setSlide((current) => (current + direction + activeWorks.length) % activeWorks.length);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveCollection(null);
      if (event.key === "ArrowRight") moveSlide(1);
      if (event.key === "ArrowLeft") moveSlide(-1);
    }

    if (activeCollection) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeCollection, activeWorks.length]);

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <SiteHeader
          brand={strings.brand}
          nav={strings.nav}
          keywords={strings.header.keywords}
          tone="page"
        />

        <div className={styles.wrap}>
        <section className={styles.hero} aria-labelledby="portfolio-title">
          <div className={styles.heroVisual}>
            {heroImage ? (
              <img src={heroImage} alt="" className={styles.heroImage} />
            ) : (
              <div className={styles.heroFallback} />
            )}
            <div className={styles.heroFade} />
            <div className={styles.heroCopy}>
              <h1 id="portfolio-title" className={styles.headline}>
                {headline}
              </h1>
              <p className={styles.lead}>{lead}</p>
              <Link href={page.reelHref} className={styles.reelButton}>
                <span className={styles.reelPlay} aria-hidden="true">
                  <Icon id="actions/play" className={styles.reelPlayIcon} />
                </span>
                {page.reelLabel}
              </Link>
            </div>
            <div className={styles.badge} aria-hidden="true">
              <span>{badge[0]}</span>
              <strong>{badge[1]}</strong>
            </div>
          </div>
        </section>

        <section className={styles.collection} aria-label="Colección de portafolio">
          <div className={styles.filters}>
            <p className={styles.filterLabel}>{page.filterLabel}</p>
            <div className={styles.filterPills} role="tablist" aria-label={page.filterLabel}>
              <button
                type="button"
                className={filter === ALL ? styles.pillActive : styles.pill}
                onClick={() => setFilter(ALL)}
                aria-pressed={filter === ALL}
              >
                {ALL}
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={filter === category ? styles.pillActive : styles.pill}
                  onClick={() => setFilter(category)}
                  aria-pressed={filter === category}
                >
                  {category}
                </button>
              ))}
            </div>
            <button type="button" className={styles.seeAll} onClick={() => setFilter(ALL)}>
              {page.seeAllLabel}
              <Icon id="actions/arrow-right" className={styles.seeAllIcon} />
            </button>
          </div>

          {visibleItems.length === 0 ? (
            <div className={styles.emptyState}>
              <h2 className={styles.emptyTitle}>{page.emptyTitle}</h2>
              <p className={styles.emptyCopy}>{page.emptyCopy}</p>
              <Link href={page.ctaHref} className={styles.ctaButton}>
                {page.ctaButton}
                <Icon id="actions/arrow-right" className={styles.ctaIcon} />
              </Link>
            </div>
          ) : (
            <div className={styles.grid}>
              {visibleItems.map((item, index) => (
                <CollectionCard
                  key={item.id}
                  item={item}
                  size={cardSize(index)}
                  onOpen={() => openCollection(item)}
                />
              ))}
            </div>
          )}
        </section>

        <section className={styles.services} aria-labelledby="services-title">
          <div className={styles.servicesIntro}>
            <div>
              <h2 id="services-title" className={styles.servicesTitle}>
                {page.servicesTitle}
              </h2>
            </div>
            <p className={styles.servicesCopy}>{page.servicesCopy}</p>
          </div>
          <ul className={styles.serviceList}>
            {page.services.map((service, index) => (
              <li key={service.title} className={styles.serviceItem}>
                <ServiceIcon index={index} />
                <h3>{service.title}</h3>
                <p>{service.copy}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.cta} aria-labelledby="portfolio-cta">
          {heroImage ? <img src={heroImage} alt="" className={styles.ctaImage} /> : null}
          <div className={styles.ctaShade} />
          <div className={styles.ctaContent}>
            <div>
              <h2 id="portfolio-cta" className={styles.ctaTitle}>
                {page.ctaTitle}
              </h2>
              <Link href={page.ctaHref} className={styles.ctaButton}>
                {page.ctaButton}
                <Icon id="actions/arrow-right" className={styles.ctaIcon} />
              </Link>
            </div>
            <ul className={styles.ctaTags}>
              {page.ctaTags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          </div>
        </section>
        </div>
      </div>

      {activeCollection ? (
        <CollectionViewer
          item={activeCollection}
          works={activeWorks}
          slide={slide}
          onSlide={setSlide}
          onClose={() => setActiveCollection(null)}
        />
      ) : null}
    </main>
  );
}

function CollectionCard({
  item,
  size,
  onOpen,
}: {
  item: PortfolioItem;
  size: "wide" | "regular";
  onOpen: () => void;
}) {
  const title = item.title?.trim();
  const category = item.category?.trim();
  const description = item.description?.trim();
  const works = collectionWorks(item);

  return (
    <article className={size === "wide" ? styles.cardWide : styles.card}>
      <button
        type="button"
        className={styles.cardButton}
        onClick={onOpen}
        aria-label={title || category || "Ver proyecto"}
      >
        <img
          src={resolveMediaUrl(item.imageUrl)}
          alt={title || "Proyecto del portafolio"}
          className={styles.cardImage}
        />
        <span className={styles.cardShade} />
        <span className={styles.cardCopy}>
          {category ? <span className={styles.cardCategory}>{category}</span> : null}
          {title ? (
            <span className={styles.cardTitle}>
              {title}
              <span aria-hidden="true"> →</span>
            </span>
          ) : null}
          {description ? <span className={styles.cardDescription}>{description}</span> : null}
          {works.length > 0 ? (
            <span className={styles.cardCount}>
              {works.length} {works.length === 1 ? "trabajo" : "trabajos"}
            </span>
          ) : null}
        </span>
        <span className={styles.playButton} aria-hidden="true">
          <Icon id="actions/play" className={styles.playIcon} />
        </span>
      </button>
    </article>
  );
}

function CollectionViewer({
  item,
  works,
  slide,
  onSlide,
  onClose,
}: {
  item: PortfolioItem;
  works: PortfolioMedia[];
  slide: number;
  onSlide: (index: number) => void;
  onClose: () => void;
}) {
  const current = works[slide];
  const hasButton = Boolean(item.hasButton && item.buttonText?.trim() && item.buttonUrl?.trim());
  const external = hasButton ? isExternalLink(item.buttonUrl!) : false;
  const youtubeId = current?.kind === "video" ? extractYouTubeId(current.url) : null;
  const youtubeEmbed = youtubeId ? getYouTubeEmbedUrl(current.url, true) : null;

  return (
    <div
      className={styles.viewer}
      role="dialog"
      aria-modal="true"
      aria-label={item.title || "Colección"}
      onClick={onClose}
    >
      <button type="button" className={styles.lightboxClose} onClick={onClose} aria-label="Cerrar">
        <Icon id="actions/x" className={styles.closeIcon} />
      </button>
      <div className={styles.viewerPanel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.viewerHead}>
          <div>
            {item.category?.trim() ? <p className={styles.lightboxCategory}>{item.category}</p> : null}
            <h3 className={styles.lightboxTitle}>{item.title?.trim() || "Colección"}</h3>
            {item.description?.trim() ? <p className={styles.lightboxDescription}>{item.description}</p> : null}
          </div>
          <p className={styles.viewerCount}>
            {works.length === 0 ? "0" : slide + 1} / {works.length}
          </p>
        </div>

        <div className={styles.viewerStage}>
          {works.length > 1 ? (
            <button type="button" className={styles.viewerArrow} onClick={() => onSlide((slide - 1 + works.length) % works.length)} aria-label="Trabajo anterior">
              <Icon id="actions/chevron-left" className={styles.viewerArrowIcon} />
            </button>
          ) : null}

          {current ? (
            youtubeEmbed ? (
              <iframe
                key={current.id}
                className={styles.viewerFrame}
                src={youtubeEmbed}
                title={item.title || "Video"}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : current.kind === "video" ? (
              <video
                key={current.id}
                className={styles.viewerMedia}
                src={resolveMediaUrl(current.url)}
                controls
                autoPlay
                playsInline
              />
            ) : (
              <img
                key={current.id}
                className={styles.viewerMedia}
                src={resolveMediaUrl(current.url)}
                alt={item.title || "Trabajo"}
              />
            )
          ) : (
            <p className={styles.viewerEmpty}>Esta colección todavía no tiene trabajos.</p>
          )}

          {works.length > 1 ? (
            <button type="button" className={`${styles.viewerArrow} ${styles.viewerArrowRight}`} onClick={() => onSlide((slide + 1) % works.length)} aria-label="Trabajo siguiente">
              <Icon id="actions/chevron-right" className={styles.viewerArrowIcon} />
            </button>
          ) : null}
        </div>

        {works.length > 1 ? (
          <div className={styles.viewerThumbs}>
            {works.map((work, index) => {
              const thumbYoutube = work.kind === "video" ? extractYouTubeId(work.url) : null;
              return (
                <button
                  key={work.id}
                  type="button"
                  className={index === slide ? styles.thumbActive : styles.thumb}
                  onClick={() => onSlide(index)}
                  aria-label={`Trabajo ${index + 1}`}
                >
                  {work.kind === "image" ? (
                    <img src={resolveMediaUrl(work.url)} alt="" />
                  ) : thumbYoutube ? (
                    <img src={`https://i.ytimg.com/vi/${thumbYoutube}/hqdefault.jpg`} alt="" />
                  ) : (
                    <span>Video</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : null}

        {hasButton ? (
          <div className={styles.viewerFooter}>
            {external ? (
              <a href={item.buttonUrl} target="_blank" rel="noopener noreferrer" className={styles.ctaButton}>
                {item.buttonText}
              </a>
            ) : (
              <Link href={item.buttonUrl!} className={styles.ctaButton}>
                {item.buttonText}
              </Link>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ServiceIcon({ index }: { index: number }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (index === 1) {
    return (
      <svg {...common}>
        <path d="M12 19V9" />
        <path d="M8 12h8" />
        <path d="M7 9h10l-1.2 3.2a2 2 0 0 1-1.9 1.3H10a2 2 0 0 1-1.9-1.3L7 9Z" />
        <circle cx="12" cy="6" r="1.4" />
      </svg>
    );
  }
  if (index === 2) {
    return (
      <svg {...common}>
        <path d="M4 8h3l1.5-2h7L17 8h3v10H4V8Z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    );
  }
  if (index === 3) {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </svg>
    );
  }
  if (index === 4) {
    return (
      <svg {...common}>
        <path d="M4 19V10" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19H2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="m10 9 5 3-5 3V9Z" />
    </svg>
  );
}
