"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/Button";
import { NavPills } from "@/components/NavPills";
import styles from "@/styles/header.module.css";

type SiteHeaderProps = {
  brand: {
    name: string;
    tagline: string;
  };
  nav: {
    ariaLabel: string;
    items: {
      id: string;
      label: string;
      href: string;
    }[];
  };
  keywords: string[];
  tone?: "landing" | "page";
  inverted?: boolean;
};

export function SiteHeader({
  brand,
  nav,
  keywords,
  tone = "landing",
  inverted = false,
}: SiteHeaderProps) {
  const isPage = tone === "page";

  return (
    <header
      className={[
        styles.header,
        isPage ? styles.pageTone : "",
        inverted ? styles.inverted : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <BrandLogo name={brand.name} tagline={brand.tagline} inverted={inverted} />
      <NavPills ariaLabel={nav.ariaLabel} items={nav.items} inverted={inverted} variant={isPage ? "plain" : "pill"} />
      {isPage ? (
        <div className={styles.aside}>
          <Button href="/contacto" label="Hablemos" variant="header" icon="arrow-right" />
        </div>
      ) : keywords.length > 0 ? (
        <div className={styles.aside}>
          <ul className={styles.keywords}>
            {keywords.map((keyword) => (
              <li key={keyword}>{keyword}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className={styles.asideSpacer} aria-hidden />
      )}
    </header>
  );
}
