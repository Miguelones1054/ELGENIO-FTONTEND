"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { useSiteConfig } from "@/components/SiteConfigProvider";
import { iconSrc, type IconId } from "@/assets/icons";
import { CONTACT_SOCIALS, resolveSocialHref } from "@/lib/contact-links";
import strings from "@/assets/strings/string-es.co.json";
import styles from "@/styles/footer.module.css";

type SiteFooterProps = {
  className?: string;
  compact?: boolean;
};

function resolveSrc(asset: string | { src: string }) {
  return typeof asset === "string" ? asset : asset.src;
}

function socialIconSrc(id: IconId) {
  return resolveSrc(iconSrc[id] as string | { src: string });
}

function FooterContent({ className, compact = false }: SiteFooterProps) {
  const { config } = useSiteConfig();
  const links = config?.contactLinks ?? {};

  const socialItems = CONTACT_SOCIALS.map((social) => {
    const value = links[social.key]?.trim() || "";
    return {
      ...social,
      value,
      href: resolveSocialHref(value, social.base),
    };
  }).filter((item) => Boolean(item.href));

  return (
    <footer
      className={[
        styles.footer,
        compact ? styles.footerCompact : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Pie de página"
      data-site-footer
    >
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <BrandLogo
            name={strings.brand.name}
            tagline={strings.brand.tagline}
            compact={compact}
            inverted
          />
          <p className={styles.brandAbout}>
            Creatividad audiovisual y marketing estratégico para marcas que buscan destacar y generar resultados reales.
          </p>
        </div>

        <div className={styles.columns}>
          <div className={styles.column}>
            <p className={styles.columnTitle}>Navegación</p>
            <nav className={styles.columnNav} aria-label="Navegación del pie de página">
              {strings.nav.items.map((item) => (
                <Link key={item.id} className={styles.link} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className={styles.column}>
            <p className={styles.columnTitle}>Conecta</p>
            <div className={styles.columnBody}>
              {links.email ? (
                <a className={styles.socialLink} href={`mailto:${links.email}`}>
                  <img
                    src={socialIconSrc("social/email")}
                    alt=""
                    className={styles.socialIcon}
                  />
                  <span>{links.email}</span>
                </a>
              ) : null}

              {socialItems.length > 0 ? (
                socialItems.map((item) => (
                  <a
                    key={item.key}
                    className={styles.socialLink}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={socialIconSrc(item.icon)}
                      alt=""
                      className={styles.socialIcon}
                    />
                    <span>{item.label}</span>
                  </a>
                ))
              ) : (
                <p className={styles.empty}>Síguenos en nuestras redes</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <p className={styles.copy}>
          © {new Date().getFullYear()} {strings.brand.name}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}

export function SiteFooter(props: SiteFooterProps) {
  const pathname = usePathname();

  if (pathname?.startsWith("/administrative-content")) {
    return null;
  }

  return <FooterContent {...props} />;
}
