"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { SiteSplash } from "@/components/SiteSplash";

export type HeroTextPart = {
  text: string;
  color: string;
  breakAfter?: boolean;
  superscript?: boolean;
};

export type CollageSlot = {
  kind?: "image" | "video" | "";
  url?: string;
  positionX?: number;
  positionY?: number;
};

export type ContactLinks = {
  email?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  facebook?: string;
  linkedin?: string;
};

export type CoverVideo = {
  enabled: boolean;
  sourceType: "direct" | "youtube";
  directUrl: string;
  youtubeUrl: string;
  title?: string;
};

export type PortfolioMedia = {
  id: string;
  kind: "image" | "video";
  url: string;
};

export type PortfolioItem = {
  id: string;
  category?: string;
  title: string;
  description: string;
  imageUrl: string;
  media?: PortfolioMedia[];
  hasButton: boolean;
  buttonText?: string;
  buttonUrl?: string;
  order?: number;
  createdAt?: string;
};

export type PortfolioCover = {
  imageUrl: string;
  headline?: string;
  description?: string;
  badgeLine1?: string;
  badgeLine2?: string;
};

export type SiteConfig = {
  whatsappPhone: string;
  heroTitle: {
    parts: HeroTextPart[];
  };
  collageMedia?: {
    hero?: CollageSlot;
    portrait?: CollageSlot;
  };
  collageMediaMobile?: {
    hero?: CollageSlot;
    portrait?: CollageSlot;
  };
  contactLinks?: ContactLinks;
  coverVideo?: CoverVideo;
  portfolioCover?: PortfolioCover;
  portfolio?: PortfolioItem[];
};

type SiteConfigContextValue = {
  config: SiteConfig;
  ready: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);

const UNAVAILABLE_MESSAGE = "No disponible. Estamos trabajando en arreglar la página.";
const MIN_SPLASH_MS = 1100;
const EXIT_MS = 980;

/** Promesa compartida: evita GET duplicados (Strict Mode / remounts). */
let siteConfigInFlight: Promise<SiteConfig> | null = null;

function validateSiteConfig(data: SiteConfig) {
  if (!data.whatsappPhone?.trim()) {
    throw new Error("whatsappPhone no configurado");
  }
  if (!data.heroTitle?.parts?.length) {
    throw new Error("heroTitle no configurado");
  }
  for (const part of data.heroTitle.parts) {
    if (!part.text?.trim() || !part.color?.trim()) {
      throw new Error("heroTitle inválido");
    }
  }
}

function fetchSiteConfigOnce(force = false): Promise<SiteConfig> {
  if (!force && siteConfigInFlight) {
    return siteConfigInFlight;
  }

  const request = apiFetch<SiteConfig>("/site-config")
    .then((data) => {
      validateSiteConfig(data);
      return data;
    })
    .catch((err) => {
      // Solo limpia el cache si esta es la promesa actual (permite reintentar)
      if (siteConfigInFlight === request) {
        siteConfigInFlight = null;
      }
      throw err;
    });

  siteConfigInFlight = request;
  return request;
}

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminArea = pathname?.startsWith("/administrative-content") ?? false;
  const isAdminDashboard = pathname?.startsWith("/administrative-content/dashboard") ?? false;
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const loadStartedAt = useRef(0);
  /** Evita que un mount cancelado (Strict Mode) marque error tras un fetch exitoso compartido. */
  const generationRef = useRef(0);

  const applyConfig = useCallback((data: SiteConfig) => {
    setConfig(data);
    setFailed(false);
  }, []);

  const loadConfig = useCallback(async (force = false) => {
    const data = await fetchSiteConfigOnce(force);
    applyConfig(data);
    return data;
  }, [applyConfig]);

  const reload = useCallback(async () => {
    setFailed(false);
    await loadConfig(true);
  }, [loadConfig]);

  useEffect(() => {
    if (isAdminArea && !isAdminDashboard) {
      setReady(true);
      setConfig(null);
      setFailed(false);
      setSplashVisible(false);
      setSplashExiting(false);
      return;
    }

    if (isAdminDashboard) {
      setSplashVisible(false);
      setSplashExiting(false);
    }

    const generation = ++generationRef.current;
    loadStartedAt.current = Date.now();
    setReady(false);
    setFailed(false);
    if (!isAdminDashboard) {
      setSplashVisible(true);
      setSplashExiting(false);
    }

    loadConfig(false)
      .then(async () => {
        if (generation !== generationRef.current) return;
        if (!isAdminDashboard) {
          const elapsed = Date.now() - loadStartedAt.current;
          const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
          if (wait > 0) {
            await new Promise((resolve) => setTimeout(resolve, wait));
          }
        }
        if (generation !== generationRef.current) return;
        setReady(true);
      })
      .catch(() => {
        if (generation !== generationRef.current) return;
        setFailed(true);
        setConfig(null);
        setReady(false);
        setSplashExiting(false);
        setSplashVisible(true);
      });
  }, [isAdminArea, isAdminDashboard, loadConfig]);

  useEffect(() => {
    if (isAdminArea || !ready || !config || failed) {
      return;
    }

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setSplashExiting(false);
      setSplashVisible(false);
      return;
    }

    setSplashExiting(true);
    const timeout = window.setTimeout(() => {
      setSplashVisible(false);
      setSplashExiting(false);
    }, EXIT_MS);

    return () => window.clearTimeout(timeout);
  }, [ready, config, failed, isAdminArea]);

  const value = useMemo<SiteConfigContextValue | null>(() => {
    if (!config) return null;
    return {
      config,
      ready,
      error: failed ? UNAVAILABLE_MESSAGE : null,
      reload,
    };
  }, [config, ready, failed, reload]);

  if (isAdminArea && !isAdminDashboard) {
    return <>{children}</>;
  }

  if (isAdminDashboard) {
    if (failed) {
      return (
        <p className="admin-config-error" style={{ padding: 24, color: "#8a1f1f" }}>
          No se pudo cargar la configuración para la vista previa.
        </p>
      );
    }
    if (!ready || !config || !value) {
      return <p style={{ padding: 24, color: "#555" }}>Cargando vista previa…</p>;
    }
    return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
  }

  if (failed) {
    return <SiteSplash message={UNAVAILABLE_MESSAGE} failed />;
  }

  if (!ready || !config || !value) {
    return <SiteSplash />;
  }

  return (
    <SiteConfigContext.Provider value={value}>
      {children}
      {splashVisible ? <SiteSplash exiting={splashExiting} /> : null}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) {
    throw new Error("useSiteConfig debe usarse dentro de SiteConfigProvider con configuración cargada");
  }
  return ctx;
}
