import { LoadingSpinner, type SpinnerSize } from "./LoadingSpinner";
import styles from "@/styles/loading.module.css";

export type LoadingOverlayProps = {
  visible?: boolean;
  text?: string;
  size?: SpinnerSize;
  rounded?: "sm" | "md" | "lg" | "none";
  fixed?: boolean;
  className?: string;
};

const roundedClassMap: Record<"sm" | "md" | "lg" | "none", string> = {
  sm: styles.roundedSm,
  md: styles.roundedMd,
  lg: styles.roundedLg,
  none: "",
};

export function LoadingOverlay({
  visible = true,
  text,
  size = "medium",
  rounded = "lg",
  fixed = false,
  className,
}: LoadingOverlayProps) {
  return (
    <div
      className={[
        styles.loadingOverlay,
        !visible ? styles.loadingOverlayHidden : "",
        fixed ? styles.overlayFixed : "",
        roundedClassMap[rounded],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!visible}
    >
      <LoadingSpinner size={size} />
      {text ? <p className={styles.loadingText}>{text}</p> : null}
    </div>
  );
}
