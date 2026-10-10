"use client";

import type { ReactNode } from "react";
import Image, { type StaticImageData } from "next/image";
import heroCamera from "@/assets/images/hero-camera.png";
import studioPortrait from "@/assets/images/studio-portrait.png";
import { useOptionalAdminEditor } from "@/components/AdminEditorContext";
import { Icon } from "@/components/Icon";
import { useSiteConfig, type CollageSlot } from "@/components/SiteConfigProvider";
import { resolveMediaUrl } from "@/lib/env";
import styles from "@/styles/media.module.css";

type MediaCollageProps = {
  heroAlt: string;
  portraitAlt: string;
  handwritten: string[];
  playCreateGrow: string[];
  established: string;
  studioCaption: string[];
  motionCaption: string;
  heroHotspot?: ReactNode;
  portraitHotspot?: ReactNode;
};

function resolveSlot(
  slot: CollageSlot | undefined,
  fallback: StaticImageData,
  defaultX: number,
  defaultY: number,
  livePos?: { x: number; y: number } | null,
) {
  const url = resolveMediaUrl(slot?.url);
  const posX =
    typeof livePos?.x === "number"
      ? livePos.x
      : typeof slot?.positionX === "number"
        ? slot.positionX
        : defaultX;
  const posY =
    typeof livePos?.y === "number"
      ? livePos.y
      : typeof slot?.positionY === "number"
        ? slot.positionY
        : defaultY;

  if (url) {
    return {
      kind: slot?.kind === "video" ? ("video" as const) : ("image" as const),
      src: url,
      remote: true,
      positionX: posX,
      positionY: posY,
    };
  }
  return {
    kind: "image" as const,
    src: fallback,
    remote: false,
    positionX: posX,
    positionY: posY,
  };
}

function CollageMediaFill({
  resolved,
  alt,
  className,
  priority,
  sizes,
}: {
  resolved: ReturnType<typeof resolveSlot>;
  alt: string;
  className: string;
  priority?: boolean;
  sizes: string;
}) {
  const style = {
    objectPosition: `${resolved.positionX}% ${resolved.positionY}%`,
  };

  if (resolved.kind === "video") {
    return (
      <video
        className={`${className} ${styles.mediaFill}`}
        src={typeof resolved.src === "string" ? resolved.src : undefined}
        style={style}
        autoPlay
        muted
        loop
        playsInline
        aria-label={alt}
      />
    );
  }

  return (
    <Image
      src={resolved.src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={className}
      style={style}
      unoptimized={resolved.remote}
    />
  );
}

export function MediaCollage({
  heroAlt,
  portraitAlt,
  handwritten,
  playCreateGrow,
  established,
  studioCaption,
  motionCaption,
  heroHotspot,
  portraitHotspot,
}: MediaCollageProps) {
  const { config } = useSiteConfig();
  const adminEditor = useOptionalAdminEditor();
  const liveHeroPos = adminEditor?.collageLivePosition?.hero;
  const livePortraitPos = adminEditor?.collageLivePosition?.portrait;

  const hero = resolveSlot(config.collageMedia?.hero, heroCamera, 34, 40, liveHeroPos);
  const portrait = resolveSlot(config.collageMedia?.portrait, studioPortrait, 58, 28, livePortraitPos);

  return (
    <div className={styles.collage}>
      <div className={styles.heroShot}>
        <CollageMediaFill
          resolved={hero}
          alt={heroAlt}
          className={styles.heroImage}
          priority
          sizes="56vw"
        />
        <span className={styles.heroShade} aria-hidden />
        {heroHotspot}
      </div>

      <div className={styles.portrait}>
        <CollageMediaFill
          resolved={portrait}
          alt={portraitAlt}
          className={styles.portraitImage}
          sizes="42vw"
        />
        <span className={styles.portraitShade} aria-hidden />
        {portraitHotspot}
      </div>

      <span className={styles.portraitFinish} aria-hidden />
      <span className={styles.badgeFill} aria-hidden />

      <div className={styles.note}>
        <p className={styles.noteText}>
          {handwritten.map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </p>
        <Icon id="marks/brush-underline" className={styles.underline} />
      </div>

      <p className={styles.studioCaption}>
        {studioCaption.map((line) => (
          <span key={line}>
            {line}
            <br />
          </span>
        ))}
      </p>
      <p className={styles.motionCaption}>{motionCaption}</p>
      <p className={styles.established}>{established}</p>

      <p className={styles.badge}>
        {playCreateGrow.map((line) => (
          <span key={line}>
            {line}
            <br />
          </span>
        ))}
      </p>
    </div>
  );
}
