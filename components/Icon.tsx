import { iconSrc, maskedIcons, type IconId } from "@/assets/icons";
import styles from "@/styles/icon.module.css";

function resolveSrc(id: IconId) {
  const asset = iconSrc[id] as string | { src: string };
  return typeof asset === "string" ? asset : asset.src;
}

type IconProps = {
  id: IconId;
  className?: string;
};

export function Icon({ id, className }: IconProps) {
  const src = resolveSrc(id);
  const classes = className ? `${styles.icon} ${className}` : styles.icon;

  if (maskedIcons.has(id)) {
    return (
      <span
        className={classes}
        style={{
          backgroundColor: "currentColor",
          WebkitMaskImage: `url("${src}")`,
          maskImage: `url("${src}")`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
        }}
        aria-hidden
      />
    );
  }

  const isBrand = id === "brand/logo-el-genio";
  return (
    <img
      src={src}
      alt=""
      className={className ? `${isBrand ? styles.logo : styles.icon} ${className}` : isBrand ? styles.logo : styles.icon}
    />
  );
}
