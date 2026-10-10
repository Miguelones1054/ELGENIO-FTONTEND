import Link from "next/link";
import { Icon } from "@/components/Icon";
import styles from "@/styles/brand.module.css";

type BrandLogoProps = {
  name: string;
  tagline: string;
  compact?: boolean;
  inverted?: boolean;
};

export function BrandLogo({
  name,
  tagline,
  compact = false,
  inverted = false,
}: BrandLogoProps) {
  return (
    <Link
      href="/"
      className={[
        styles.brand,
        compact ? styles.compact : "",
        inverted ? styles.inverted : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={name}
    >
      <Icon id="brand/logo-el-genio" className={styles.mark} />
      {!compact ? <p className={styles.tagline}>{tagline}</p> : null}
    </Link>
  );
}
