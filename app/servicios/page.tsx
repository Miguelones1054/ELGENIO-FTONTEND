import type { Metadata } from "next";
import { ServicesPageView } from "@/components/ServicesPageView";
import strings from "@/assets/strings/string-es.co.json";

const page = strings.pages.servicios;

export const metadata: Metadata = {
  title: `${page.title} | ${strings.brand.name}`,
  description: page.copy,
};

export default function ServiciosPage() {
  return <ServicesPageView />;
}
