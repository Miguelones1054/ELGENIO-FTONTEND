"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import heroCamera from "@/assets/images/hero-camera.png";
import { ContactSection } from "@/components/ContactSection";
import { SiteHeader } from "@/components/SiteHeader";
import strings from "@/assets/strings/string-es.co.json";
import styles from "@/styles/welcome.module.css";

type ContactPageViewProps = {
  overlay?: ReactNode;
  className?: string;
  shellClassName?: string;
  showEmptySlots?: boolean;
};

export function ContactPageView({
  overlay,
  className,
  shellClassName,
  showEmptySlots = false,
}: ContactPageViewProps) {
  const page = strings.pages.contacto;

  return (
    <main className={[styles.page, className].filter(Boolean).join(" ")}>
      <div className={[styles.contactShell, shellClassName].filter(Boolean).join(" ")}>
        <div className={styles.contactBackdrop} aria-hidden>
          <Image
            src={heroCamera}
            alt=""
            fill
            priority
            sizes="100vw"
            className={styles.contactBackdropImage}
          />
        </div>

        <SiteHeader
          brand={strings.brand}
          nav={strings.nav}
          keywords={[]}
          tone="landing"
          inverted
        />

        <div className={styles.contactBody}>
          <ContactSection
            title={page.title}
            intro={page.copy}
            overlay={overlay}
            showEmptySlots={showEmptySlots}
            showBackdrop={false}
          />
        </div>
      </div>
    </main>
  );
}
