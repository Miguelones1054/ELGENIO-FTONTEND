import type { CSSProperties } from "react";
import { lightTheme } from "@/assets/colors/light";
import { shadows } from "@/styles/shadows";

function kebab(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

export function themeStyle(): CSSProperties {
  const vars: Record<string, string> = {};

  for (const [key, value] of Object.entries(lightTheme)) {
    vars[`--color-${kebab(key)}`] = value;
  }

  for (const [key, value] of Object.entries(shadows)) {
    vars[`--shadow-${kebab(key)}`] = value;
  }

  return vars as CSSProperties;
}
