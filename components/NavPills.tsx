"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { useSectionTransition } from "@/components/SectionTransition";
import styles from "@/styles/nav.module.css";

type NavItem = {
  id: string;
  label: string;
  href: string;
};

type NavPillsProps = {
  ariaLabel: string;
  items: NavItem[];
  inverted?: boolean;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavPills({ ariaLabel, items, inverted = false }: NavPillsProps) {
  const pathname = usePathname();
  const { targetHref } = useSectionTransition();

  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  // La ruta activa prioriza el destino de transición si está navegando
  const effectivePath = targetHref || pathname || "/";

  const [pillState, setPillState] = useState<{
    left: number;
    width: number;
    visible: boolean;
  }>({ left: 0, width: 0, visible: false });

  const [hoverState, setHoverState] = useState<{
    left: number;
    width: number;
    visible: boolean;
  }>({ left: 0, width: 0, visible: false });

  // Medir y animar la cápsula activa
  const updateActivePill = useCallback(() => {
    const navEl = navRef.current;
    if (!navEl) return;

    const activeItem = items.find((item) => isActivePath(effectivePath, item.href));
    if (!activeItem) {
      setPillState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const itemEl = itemRefs.current[activeItem.id];
    if (!itemEl) return;

    const navRect = navEl.getBoundingClientRect();
    const itemRect = itemEl.getBoundingClientRect();

    const left = itemRect.left - navRect.left;
    const width = itemRect.width;

    setPillState({
      left,
      width,
      visible: true,
    });
  }, [items, effectivePath]);

  useEffect(() => {
    updateActivePill();

    // Re-medir tras renderizado de fuentes por si cambian anchos
    const timer = setTimeout(updateActivePill, 40);
    const handleResize = () => updateActivePill();

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [updateActivePill]);

  const handleItemMouseEnter = (id: string) => {
    const navEl = navRef.current;
    const itemEl = itemRefs.current[id];
    if (!navEl || !itemEl) return;

    const navRect = navEl.getBoundingClientRect();
    const itemRect = itemEl.getBoundingClientRect();

    setHoverState({
      left: itemRect.left - navRect.left,
      width: itemRect.width,
      visible: true,
    });
  };

  return (
    <nav
      ref={navRef}
      className={[styles.nav, inverted ? styles.inverted : ""].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      onMouseLeave={() => setHoverState((prev) => ({ ...prev, visible: false }))}
    >
      {/* Cápsula deslizante activa */}
      {pillState.visible ? (
        <span
          className={styles.slidingPill}
          style={{
            transform: `translate3d(${pillState.left}px, 0, 0)`,
            width: `${pillState.width}px`,
          }}
          aria-hidden="true"
        />
      ) : null}

      {/* Resplandor fantasma en hover */}
      {hoverState.visible ? (
        <span
          className={styles.hoverGhost}
          style={{
            transform: `translate3d(${hoverState.left}px, 0, 0)`,
            width: `${hoverState.width}px`,
          }}
          aria-hidden="true"
        />
      ) : null}

      {items.map((item) => {
        const active = isActivePath(effectivePath, item.href);

        return (
          <Link
            key={item.id}
            ref={(el) => {
              itemRefs.current[item.id] = el;
            }}
            href={item.href}
            data-transition-title={item.label}
            className={[
              styles.item,
              active ? styles.active : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={active ? "page" : undefined}
            onMouseEnter={() => handleItemMouseEnter(item.id)}
          >
            {active ? (
              <Icon id="navigation/active-dot" className={styles.dot} />
            ) : null}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
