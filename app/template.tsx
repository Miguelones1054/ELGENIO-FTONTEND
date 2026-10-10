"use client";

import { useEffect, type ReactNode } from "react";
import { useSectionTransition } from "@/components/SectionTransition";
import styles from "@/styles/section-transition.module.css";

export default function Template({ children }: { children: ReactNode }) {
  const { onEntered, status } = useSectionTransition();

  useEffect(() => {
    onEntered();
  }, [onEntered]);

  return (
    <div
      className={[
        styles.templateContainer,
        status === "leaving" ? styles.templateLeaving : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
