import arrowRight from "./actions/arrow-right.svg";
import chevronLeft from "./actions/chevron-left.svg";
import chevronRight from "./actions/chevron-right.svg";
import menu from "./actions/menu.svg";
import play from "./actions/play.svg";
import x from "./actions/x.svg";
import logoElGenio from "./brand/logo-el-genio.svg";
import brushUnderline from "./marks/brush-underline.svg";
import handArc from "./marks/hand-arc.svg";
import activeDot from "./navigation/active-dot.svg";
import email from "./social/email.svg";
import facebook from "./social/facebook.svg";
import instagram from "./social/instagram.svg";
import linkedin from "./social/linkedin.svg";
import tiktok from "./social/tiktok.svg";
import whatsapp from "./social/whatsapp.svg";
import youtube from "./social/youtube.svg";

export const iconSrc = {
  "actions/arrow-right": arrowRight,
  "actions/chevron-left": chevronLeft,
  "actions/chevron-right": chevronRight,
  "actions/menu": menu,
  "actions/play": play,
  "actions/x": x,
  "brand/logo-el-genio": logoElGenio,
  "marks/brush-underline": brushUnderline,
  "marks/hand-arc": handArc,
  "navigation/active-dot": activeDot,
  "social/email": email,
  "social/facebook": facebook,
  "social/instagram": instagram,
  "social/linkedin": linkedin,
  "social/tiktok": tiktok,
  "social/whatsapp": whatsapp,
  "social/youtube": youtube,
} as const;

export type IconId = keyof typeof iconSrc;

export const maskedIcons: ReadonlySet<IconId> = new Set([
  "actions/arrow-right",
  "actions/chevron-left",
  "actions/chevron-right",
  "actions/menu",
  "actions/play",
  "actions/x",
  "marks/brush-underline",
  "marks/hand-arc",
  "navigation/active-dot",
  "social/email",
]);
