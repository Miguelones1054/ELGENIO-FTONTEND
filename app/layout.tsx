import type { Metadata } from "next";
import { Barlow_Condensed, Caveat } from "next/font/google";
import localFont from "next/font/local";
import { ContentShell } from "@/components/ContentShell";
import { SiteConfigProvider } from "@/components/SiteConfigProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { CoverVideoModal } from "@/components/CoverVideoModal";
import { SectionTransitionProvider } from "@/components/SectionTransition";
import strings from "@/assets/strings/string-es.co.json";
import { themeStyle } from "@/styles/css-variables";
import "./globals.css";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
});

const body = localFont({
  src: [
    {
      path: "../assets/fonts/Poppins-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/Poppins-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../assets/fonts/Poppins-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../assets/fonts/Poppins-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-body",
  display: "swap",
});

const script = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-script",
});

export const metadata: Metadata = {
  title: strings.brand.name,
  description: strings.hero.description,
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.svg"],
    apple: [{ url: "/favicon.svg" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-CO"
      className={`${display.variable} ${body.variable} ${script.variable}`}
      style={themeStyle()}
      data-scroll-behavior="smooth"
    >
      <body>
        <SiteConfigProvider>
          <SectionTransitionProvider>
            <ContentShell>
              {children}
              <SiteFooter />
            </ContentShell>
            <WhatsAppFloat />
            <CoverVideoModal />
          </SectionTransitionProvider>
        </SiteConfigProvider>
      </body>
    </html>
  );
}
