import type { Metadata } from "next";
import { ContactPageView } from "@/components/ContactPageView";
import strings from "@/assets/strings/string-es.co.json";

const page = strings.pages.contacto;

export const metadata: Metadata = {
  title: `${page.title} | ${strings.brand.name}`,
};

export default function ContactoPage() {
  return <ContactPageView />;
}
