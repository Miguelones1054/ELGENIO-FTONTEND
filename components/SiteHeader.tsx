"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { Icon } from "@/components/Icon";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <header
      className={[
        styles.header,
        tone === "page" ? styles.pageTone : "",
        inverted ? styles.inverted : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <BrandLogo name={brand.name} tagline={brand.tagline} inverted={inverted} />
      <NavPills ariaLabel={nav.ariaLabel} items={nav.items} inverted={inverted} />
      {keywords.length > 0 ? (
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

      <button
        type="button"
        className={styles.menuButton}
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={menuOpen}
        aria-controls={panelId}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <Icon id="actions/menu" className={styles.menuIcon} />
      </button>

      <div
        className={[
          styles.drawerRoot,
          menuOpen ? styles.drawerOpen : styles.drawerClosed,
        ].join(" ")}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          className={styles.drawerBackdrop}
          aria-label="Cerrar menú"
          tabIndex={menuOpen ? 0 : -1}
          onClick={() => setMenuOpen(false)}
        />
        <nav
          id={panelId}
          className={styles.drawer}
          aria-label={nav.ariaLabel}
          aria-hidden={!menuOpen}
        >
          <div className={styles.drawerHead}>
            <p className={styles.drawerTitle}>Secciones</p>
            <button
              type="button"
              className={styles.drawerClose}
              aria-label="Cerrar menú"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => setMenuOpen(false)}
            >
              <Icon id="actions/x" className={styles.closeIcon} />
            </button>
          </div>
          <ul className={styles.drawerList}>
            {nav.items.map((item, index) => (
              <li key={item.id}>
                <Link
                  className={styles.drawerLink}
                  href={item.href}
                  data-transition-title={item.label}
                  style={{ animationDelay: `${index * 55 + 80}ms` }}
                  tabIndex={menuOpen ? 0 : -1}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
