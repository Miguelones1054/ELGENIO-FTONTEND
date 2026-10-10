import type { Metadata } from "next";
import { PortfolioPageView } from "@/components/PortfolioPageView";
import strings from "@/assets/strings/string-es.co.json";

const page = strings.pages.portafolio;

export const metadata: Metadata = {
  title: `${page.title} | ${strings.brand.name}`,
  description: "Portafolio fotográfico y proyectos de El Genio Creativo.",
};

export default function PortafolioPage() {
  return <PortfolioPageView />;
}
