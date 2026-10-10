"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "@/styles/section-transition.module.css";
import strings from "@/assets/strings/string-es.co.json";

type TransitionStatus = "idle" | "leaving" | "entering";

type SectionTransitionContextValue = {
  status: TransitionStatus;
  targetHref: string | null;
  targetTitle: string | null;
  navigate: (href: string, title?: string) => void;
  onEntered: () => void;
};

const SectionTransitionContext = createContext<SectionTransitionContextValue>({
  status: "idle",
  targetHref: null,
  targetTitle: null,
  navigate: () => {},
  onEntered: () => {},
});

export function useSectionTransition() {
  return useContext(SectionTransitionContext);
}

const SECTION_TITLE_MAP: Record<string, string> = {
  "/": "Inicio",
  "/servicios": "Servicios",
  "/portafolio": "Portafolio",
  "/nosotros": "Nosotros",
  "/contacto": "Contacto",
  "/reel": "Showreel",
};

function resolveTitleForHref(href: string): string {
  const clean = href.split("?")[0].replace(/\/+$/, "") || "/";
  if (SECTION_TITLE_MAP[clean]) {
    return SECTION_TITLE_MAP[clean];
  }
  const navItem = strings.nav?.items?.find((item) => item.href === clean);
  if (navItem) return navItem.label;
  return clean.replace("/", "").toUpperCase() || "El Genio";
}

const ENTER_DURATION_MS = 280;
const SAFETY_RESET_MS = 1200;

export function SectionTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [status, setStatus] = useState<TransitionStatus>("idle");
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const [targetTitle, setTargetTitle] = useState<string | null>(null);

  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
  }, []);

  const navigate = useCallback(
    (href: string, customTitle?: string) => {
      const cleanCurrent = (pathname || "/").split("?")[0].replace(/\/+$/, "") || "/";
      const cleanTarget = href.split("?")[0].replace(/\/+$/, "") || "/";

      if (cleanCurrent === cleanTarget) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      clearTimers();
      const resolvedTitle = customTitle || resolveTitleForHref(href);

      setTargetHref(href);
      setTargetTitle(resolvedTitle);
      setStatus("leaving");

      // Navegación nativa de Next.js
      router.push(href);

      safetyTimerRef.current = setTimeout(() => {
        setStatus("idle");
        setTargetHref(null);
        setTargetTitle(null);
      }, SAFETY_RESET_MS);
    },
    [pathname, clearTimers, router]
  );

  const onEntered = useCallback(() => {
    setStatus((prev) => {
      if (prev === "leaving") {
        clearTimers();
        window.scrollTo({ top: 0, left: 0 });

        transitionTimerRef.current = setTimeout(() => {
          setStatus("idle");
          setTargetHref(null);
          setTargetTitle(null);
        }, ENTER_DURATION_MS);

        return "entering";
      }
      return "idle";
    });
  }, [clearTimers]);

  // Interceptar clicks en enlaces internos para activar la animación de cortina sin bloquear la navegación
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Omitir enlaces externos o anchors internos
      if (
        href.startsWith("#") ||
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.getAttribute("target") === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      const isInternal =
        (href.startsWith("/") && !href.startsWith("//")) ||
        href.startsWith(window.location.origin);

      if (!isInternal) return;

      if (href.startsWith("/administrative-content")) return;

      const pathOnly = href.replace(window.location.origin, "");
      const cleanCurrent = (pathname || "/").split("?")[0].replace(/\/+$/, "") || "/";
      const cleanTarget = pathOnly.split("?")[0].replace(/\/+$/, "") || "/";

      if (cleanCurrent === cleanTarget) {
        return;
      }

      const explicitTitle =
        anchor.getAttribute("data-transition-title") ||
        anchor.getAttribute("aria-label") ||
        anchor.textContent?.trim() ||
        undefined;

      const resolvedTitle = explicitTitle || resolveTitleForHref(pathOnly);

      clearTimers();
      setTargetHref(pathOnly);
      setTargetTitle(resolvedTitle);
      setStatus("leaving");

      safetyTimerRef.current = setTimeout(() => {
        setStatus("idle");
        setTargetHref(null);
        setTargetTitle(null);
      }, SAFETY_RESET_MS);
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      clearTimers();
    };
  }, [pathname, clearTimers]);

  // Sincronizar en popstate (Back / Forward de navegador)
  useEffect(() => {
    const onPopState = () => {
      onEntered();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [onEntered]);

  const isShutterActive = status === "leaving" || status === "entering";

  return (
    <SectionTransitionContext.Provider
      value={{
        status,
        targetHref,
        targetTitle,
        navigate,
        onEntered,
      }}
    >
      {children}

      {isShutterActive ? (
        <div
          className={[
            styles.shutterOverlay,
            status === "leaving" ? styles.shutterLeaving : styles.shutterEntering,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        >
          <div className={styles.backdrop} />
          <div className={styles.anamorphicBeam} />
          <div className={styles.lensFlare} />

          <div className={styles.shutterHud}>
            <div className={styles.hudTop}>
              <span className={styles.hudBracket}>⌜ CINEMA LAB ⌝</span>
              <span>EL GENIO · ESTUDIO CREATIVO</span>
              <span className={styles.hudBracket}>⌞ 2026 ⌟</span>
            </div>

            <div className={styles.hudCenter}>
              <div className={styles.hudKicker}>
                <span className={styles.hudKickerDot} />
                <span>Transición de escena</span>
                <span className={styles.hudKickerDot} />
              </div>
              <h2 className={styles.hudTitle}>
                {targetTitle || "El Genio"}
              </h2>
            </div>

            <div className={styles.hudBottom}>
              <span className={styles.recBadge}>
                <span className={styles.recDot} />
                REC LIVE
              </span>
              <span>4K CINEMA · 24 FPS · ANAMORPHIC</span>
              <span>PROYECTO ACTIVO</span>
            </div>
          </div>
        </div>
      ) : null}
    </SectionTransitionContext.Provider>
  );
}
