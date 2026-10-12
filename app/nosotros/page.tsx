import type { Metadata } from "next";
import { AboutPageView } from "@/components/AboutPageView";
import strings from "@/assets/strings/string-es.co.json";

const page = strings.pages.nosotros;

export const metadata: Metadata = {
  title: `${page.title} | ${strings.brand.name}`,
  description: page.copy,
};

export default function NosotrosPage() {
  return <AboutPageView />;
}
