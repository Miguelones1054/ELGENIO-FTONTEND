import type { Metadata } from "next";
import { PortfolioPageView } from "@/components/PortfolioPageView";
import strings from "@/assets/strings/string-es.co.json";

const page = strings.pages.portafolio;

export const metadata: Metadata = {
  title: `${page.title} | ${strings.brand.name}`,
  description: page.copy,
};

export default function PortafolioPage() {
  return <PortfolioPageView />;
}
