import { AccentShapes } from "@/components/AccentShapes";
import { HeroSection } from "@/components/HeroSection";
import { MediaCollage } from "@/components/MediaCollage";
import { SiteHeader } from "@/components/SiteHeader";
import strings from "@/assets/strings/string-es.co.json";
import styles from "@/styles/welcome.module.css";

export default function Welcome() {
  return (
    <main className={styles.page}>
      <div className={styles.landing}>
        <MediaCollage
          heroAlt={strings.media.heroAlt}
          portraitAlt={strings.media.portraitAlt}
          handwritten={strings.aside.handwritten}
          playCreateGrow={strings.aside.playCreateGrow}
          established={strings.aside.established}
          studioCaption={strings.aside.studioCaption}
          motionCaption={strings.aside.motionCaption}
        />
        <AccentShapes />
        <SiteHeader
          brand={strings.brand}
          nav={strings.nav}
          keywords={strings.header.keywords}
        />
        <HeroSection hero={strings.hero} creativity={strings.aside.creativity} />
      </div>
    </main>
  );
}
