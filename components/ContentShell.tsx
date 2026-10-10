"use client";

import type { ReactNode } from "react";
import styles from "@/styles/content-shell.module.css";

export function ContentShell({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>{children}</div>;
}
