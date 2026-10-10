import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administrative content | El Genio",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdministrativeContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
