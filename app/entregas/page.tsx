import type { Metadata } from "next";
import { DeliveriesPageView } from "@/components/DeliveriesPageView";
import strings from "@/assets/strings/string-es.co.json";

const page = strings.pages.entregas;

export const metadata: Metadata = {
  title: `${page.title} | ${strings.brand.name}`,
  description: page.copy,
};

export default function EntregasPage() {
  return <DeliveriesPageView />;
}
