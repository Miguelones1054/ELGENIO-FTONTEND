import styles from "@/styles/loading.module.css";

export type SpinnerSize = "small" | "medium" | "large";

export type LoadingSpinnerProps = {
  size?: SpinnerSize;
  className?: string;
};

const sizeClassMap: Record<SpinnerSize, string> = {
  small: styles.sizeSmall,
  medium: styles.sizeMedium,
  large: styles.sizeLarge,
};

export function LoadingSpinner({ size = "medium", className }: LoadingSpinnerProps) {
  return (
    <div
      className={[styles.spinnerContainer, sizeClassMap[size], className]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-label="Cargando"
    >
      <div className={styles.spinnerRing} />
      <div className={styles.spinnerInnerRing} />
      <div className={styles.spinnerCore} />
    </div>
  );
}
