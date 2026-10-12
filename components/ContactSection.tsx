"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import heroCamera from "@/assets/images/hero-camera.png";
import { ContactLeadForm } from "@/components/ContactLeadForm";
import whatsappIcon from "@/assets/icons/social/whatsapp.svg";
import { Icon } from "@/components/Icon";
import { iconSrc, type IconId } from "@/assets/icons";
import { useSiteConfig } from "@/components/SiteConfigProvider";
import strings from "@/assets/strings/string-es.co.json";
import {
  CONTACT_SOCIALS,
  resolveSocialHref,
} from "@/lib/contact-links";
import styles from "@/styles/contact.module.css";

type ContactSectionProps = {
  title: string;
  intro?: string;
  overlay?: ReactNode;
  /** En admin, muestra todos los canales con icono aunque aún no tengan valor. */
  showEmptySlots?: boolean;
  /** Si false, el fondo lo pinta el shell de la página (full-bleed bajo el header). */
  showBackdrop?: boolean;
};

function resolveSrc(asset: string | { src: string }) {
  return typeof asset === "string" ? asset : asset.src;
}

function socialIconSrc(id: IconId) {
  return resolveSrc(iconSrc[id] as string | { src: string });
}

export function ContactSection({
  title,
  intro = "Escríbenos o síguenos. Estamos listos para hacer crecer tu marca.",
  overlay,
  showEmptySlots = false,
  showBackdrop = true,
}: ContactSectionProps) {
  const { config } = useSiteConfig();
  const links = config.contactLinks ?? {
    email: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    facebook: "",
    linkedin: "",
  };

  const socialItems = CONTACT_SOCIALS.map((social) => {
    const value = links[social.key]?.trim() || "";
    return {
      ...social,
      value,
      href: resolveSocialHref(value, social.base),
    };
  }).filter((item) => showEmptySlots || item.href);

  const email = links.email?.trim() || "";
  const whatsappPhone = config.whatsappPhone?.replace(/\D/g, "") || "";
  const whatsappLink = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?${new URLSearchParams({ text: strings.whatsapp.message }).toString()}`
    : "";

  return (
    <section
      className={[styles.section, !showBackdrop ? styles.sectionEmbedded : ""].filter(Boolean).join(" ")}
      aria-label={title}
    >
      {showBackdrop ? (
        <div className={styles.backdrop} aria-hidden>
          <Image
            src={heroCamera}
            alt=""
            fill
            priority
            sizes="100vw"
            className={styles.backdropImage}
          />
        </div>
      ) : null}

      <h1 className={styles.srOnly}>{title}</h1>

      <div className={styles.layout}>
        <div className={styles.content}>
          {intro ? <p className={styles.intro}>{intro}</p> : null}

          {email || showEmptySlots ? (
            <div className={styles.actions}>
              {email ? (
                <a className={styles.primaryAction} href={`mailto:${email}`}>
                  <span className={styles.actionIcon} aria-hidden>
                    <Icon id="social/email" className={styles.actionGlyph} />
                  </span>
                  <span className={styles.actionText}>
                    <span className={styles.actionLabel}>Correo</span>
                    <span className={styles.actionValue}>{email}</span>
                  </span>
                </a>
              ) : (
                <div className={styles.primaryAction}>
                  <span className={styles.actionIcon} aria-hidden>
                    <Icon id="social/email" className={styles.actionGlyph} />
                  </span>
                  <span className={styles.actionText}>
                    <span className={styles.actionLabel}>Correo</span>
                    <span className={styles.actionValue}>Sin configurar</span>
                  </span>
                </div>
              )}
            </div>
          ) : null}

          {socialItems.length > 0 ? (
            <ul className={styles.socialList} aria-label="Redes sociales">
              {socialItems.map((item) => {
                const body = (
                  <>
                    <img
                      src={socialIconSrc(item.icon)}
                      alt=""
                      className={styles.socialIcon}
                    />
                    <span className={styles.socialLabel}>{item.label}</span>
                  </>
                );

                return (
                  <li key={item.key}>
                    {item.href ? (
                      <a
                        className={styles.socialLink}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {body}
                      </a>
                    ) : (
                      <span className={`${styles.socialLink} ${styles.socialMuted}`}>{body}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <div className={styles.formCol}>
          {whatsappLink ? (
            <a
              className={styles.whatsappCall}
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className={styles.whatsappCallTitle}>{strings.whatsapp.promptTitle}</span>
              <span className={styles.whatsappCallCopy}>{strings.whatsapp.promptCopy}</span>
              <span className={styles.whatsappCallBtn}>
                <img src={resolveSrc(whatsappIcon)} alt="" className={styles.whatsappCallIcon} />
                {strings.whatsapp.promptButton}
              </span>
            </a>
          ) : null}
          <ContactLeadForm />
        </div>
      </div>

      {overlay}
    </section>
  );
}
