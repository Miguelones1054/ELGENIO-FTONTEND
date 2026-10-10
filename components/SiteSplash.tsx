import Image from "next/image";
import { Icon } from "@/components/Icon";
import heroCamera from "@/assets/images/hero-camera.png";
import strings from "@/assets/strings/string-es.co.json";
import styles from "@/styles/splash.module.css";

type SiteSplashProps = {
  message?: string;
  failed?: boolean;
  exiting?: boolean;
};

export function SiteSplash({ message, failed = false, exiting = false }: SiteSplashProps) {
  return (
    <div
      className={[
        styles.splash,
        failed ? styles.failed : "",
        exiting ? styles.exiting : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role={failed ? "alert" : "status"}
      aria-live="polite"
      aria-label={failed ? "Página no disponible" : "Cargando configuración"}
      aria-hidden={exiting || undefined}
    >
      <div className={styles.stage} aria-hidden>
        <Image
          src={heroCamera}
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.bgImage}
        />
        <div className={styles.anamorphicBeam} />
        <div className={styles.ambientGlowOrange} />
        <div className={styles.ambientGlowBlue} />
        <div className={styles.shimmerLines} />
        <div className={styles.vignette} />
      </div>

      <div className={styles.inner}>
        <div className={styles.logoContainer}>
          <span className={styles.coreAura} />
          <span className={styles.radialPulse} />
          <div className={styles.logoWrapper}>
            <Icon id="brand/logo-el-genio" className={styles.logo} />
          </div>
        </div>

        <div className={styles.brandLockup}>
          <h1 className={styles.brandTitle}>{strings.brand.name}</h1>
          <p className={styles.brandTagline}>{strings.brand.tagline}</p>
        </div>

        {!failed ? (
          <div className={styles.loaderWrap} aria-hidden>
            <div className={styles.loaderBar} />
          </div>
        ) : null}

        {message ? <p className={styles.copy}>{message}</p> : null}
      </div>
    </div>
  );
}
