import type { IconId } from "@/assets/icons";
import type { ContactLinks } from "@/components/SiteConfigProvider";

export type SocialKey = Exclude<keyof ContactLinks, "email">;

export const CONTACT_SOCIALS: {
  key: SocialKey;
  label: string;
  icon: IconId;
  color: string;
  base: string;
  placeholder: string;
}[] = [
  {
    key: "instagram",
    label: "Instagram",
    icon: "social/instagram",
    color: "#E4405F",
    base: "https://instagram.com/",
    placeholder: "@elgenio o URL https://",
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: "social/tiktok",
    color: "#000000",
    base: "https://www.tiktok.com/@",
    placeholder: "@elgenio o URL https://",
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: "social/youtube",
    color: "#FF0000",
    base: "https://www.youtube.com/",
    placeholder: "@canal o URL https://",
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: "social/facebook",
    color: "#0866FF",
    base: "https://facebook.com/",
    placeholder: "pagina o URL https://",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: "social/linkedin",
    color: "#0A66C2",
    base: "https://www.linkedin.com/",
    placeholder: "company/... o URL https://",
  },
];

export const CONTACT_EMAIL_FIELD = {
  key: "email" as const,
  label: "Correo",
  icon: "social/email" as IconId,
  placeholder: "hola@elgenio.co",
};

export function resolveSocialHref(value: string, base: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, "");
  return `${base}${handle}`;
}
