import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import strings from "@/assets/strings/string-es.co.json";

const page = strings.pages.servicios;

export const metadata: Metadata = {
  title: `${page.title} | ${strings.brand.name}`,
};

export default function ServiciosPage() {
  return <ContentPage title={page.title} copy={page.copy} side="left" />;
}
