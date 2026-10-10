import { Icon } from "@/components/Icon";
import styles from "@/styles/shapes.module.css";

type AccentShapesProps = {
  variant?: "hero" | "section";
  side?: "left" | "right";
};

export function AccentShapes({ variant = "hero", side = "left" }: AccentShapesProps) {
  if (variant === "section") {
    const isRight = side === "right";

    return (
      <div className={styles.sectionRings} aria-hidden>
        <div
          className={`${styles.sectionRing} ${styles.sectionRingPrimary} ${
            isRight ? styles.sectionRingRight : styles.sectionRingLeft
          }`}
        >
          <Icon id="marks/hand-arc" className={styles.arcMark} />
        </div>
        <div
          className={`${styles.sectionRing} ${styles.sectionRingSecondary} ${
            isRight ? styles.sectionRingSecondaryRight : styles.sectionRingSecondaryLeft
          }`}
        >
          <Icon id="marks/hand-arc" className={styles.arcMark} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.leftArc} aria-hidden>
      <Icon id="marks/hand-arc" className={styles.arcMark} />
    </div>
  );
}
