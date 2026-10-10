import Link from "next/link";
import { Icon } from "@/components/Icon";
import styles from "@/styles/buttons.module.css";

type ButtonVariant = "primary" | "header" | "play";
type ButtonIcon = "arrow-right" | "play";

type ButtonProps = {
  href: string;
  label: string;
  variant: ButtonVariant;
  icon?: ButtonIcon;
};

export function Button({ href, label, variant, icon }: ButtonProps) {
  return (
    <Link href={href} className={styles[variant]}>
      {icon === "play" ? <Icon id="actions/play" className={styles.playIcon} /> : null}
      <span>{label}</span>
      {icon === "arrow-right" ? <Icon id="actions/arrow-right" className={styles.arrow} /> : null}
    </Link>
  );
}
