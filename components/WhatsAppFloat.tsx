"use client";

import { usePathname } from "next/navigation";
import whatsappIcon from "@/assets/icons/social/whatsapp.svg";
import { useSiteConfig } from "@/components/SiteConfigProvider";
import strings from "@/assets/strings/string-es.co.json";
import styles from "@/styles/whatsapp.module.css";

function resolveSrc(asset: string | { src: string }) {
  return typeof asset === "string" ? asset : asset.src;
}

function whatsappHref(phone: string, message: string) {
  const params = new URLSearchParams({ text: message });
  return `https://wa.me/${phone}?${params.toString()}`;
}

function WhatsAppFloatButton() {
  const { config } = useSiteConfig();

  return (
    <a
      className={styles.fab}
      href={whatsappHref(config.whatsappPhone, strings.whatsapp.message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={strings.whatsapp.label}
    >
      <img src={resolveSrc(whatsappIcon)} alt="" className={styles.icon} />
    </a>
  );
}

export function WhatsAppFloat() {
  const pathname = usePathname();

  if (pathname?.startsWith("/administrative-content")) {
    return null;
  }

  return <WhatsAppFloatButton />;
}
