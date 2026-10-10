"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/Button";
import { useSiteConfig } from "@/components/SiteConfigProvider";
import styles from "@/styles/hero.module.css";

type HeroSectionProps = {
  hero: {
    kicker: string[];
    kickerSeparator: string;
    description: string;
    primaryCta: string;
    primaryHref: string;
    secondaryCta?: string;
    secondaryHref?: string;
  };
  creativity: string[];
  titleHotspot?: ReactNode;
};

export function HeroSection({ hero, creativity, titleHotspot }: HeroSectionProps) {
  const { config } = useSiteConfig();

  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.kicker}>{hero.kicker.join(` ${hero.kickerSeparator} `)}</p>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>
            {config.heroTitle.parts.map((part, index) => (
              <span key={`${part.text}-${index}`} style={{ color: part.color }}>
                {part.superscript ? <sup className={styles.registered}>{part.text}</sup> : part.text}
                {part.breakAfter ? <br /> : null}
              </span>
            ))}
          </h1>
          {titleHotspot}
        </div>
        <p className={styles.description}>{hero.description}</p>
        <div className={styles.actions}>
          <Button href={hero.primaryHref} label={hero.primaryCta} variant="primary" icon="arrow-right" />
          {hero.secondaryCta && hero.secondaryHref ? (
            <Button href={hero.secondaryHref} label={hero.secondaryCta} variant="play" icon="play" />
          ) : null}
        </div>
        <div className={styles.foot}>
          <p className={styles.creativity}>
            {creativity.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
