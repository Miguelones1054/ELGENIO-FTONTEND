"use client";

import whatsappIcon from "@/assets/icons/social/whatsapp.svg";
import { AccentShapes } from "@/components/AccentShapes";
import { ContactPageView } from "@/components/ContactPageView";
import { EditableHotspot } from "@/components/EditableHotspot";
import { useAdminEditor } from "@/components/AdminEditorContext";
import { HeroSection } from "@/components/HeroSection";
import { MediaCollage } from "@/components/MediaCollage";
import { SiteHeader } from "@/components/SiteHeader";
import strings from "@/assets/strings/string-es.co.json";
import adminStyles from "@/styles/admin.module.css";
import welcomeStyles from "@/styles/welcome.module.css";
import waStyles from "@/styles/whatsapp.module.css";

function resolveSrc(asset: string | { src: string }) {
  return typeof asset === "string" ? asset : asset.src;
}

function PreviewWhatsAppFab() {
  return (
    <div className={adminStyles.whatsappAnchor}>
      <EditableHotspot id="whatsapp" className={adminStyles.hotspotFill}>
        <span className={`${waStyles.fab} ${adminStyles.previewFab}`} aria-hidden>
          <img src={resolveSrc(whatsappIcon)} alt="" className={waStyles.icon} />
        </span>
      </EditableHotspot>
    </div>
  );
}

export function AdminPagePreview() {
  const { select, previewViewport, previewPage } = useAdminEditor();
  const isNarrow = previewViewport === "mobile";
  const isContact = previewPage === "contacto";

  return (
    <div
      className={adminStyles.previewStage}
      onClick={() => select(null)}
      role="presentation"
    >
      <div className={adminStyles.previewHint}>
        {isContact
          ? "Vista Contacto · correo, redes y WhatsApp."
          : isNarrow
            ? "Vista estrecha · misma página, con menú drawer para navegar."
            : "Vista escritorio · haz clic en un bloque para editarlo."}
      </div>

      <div
        className={[
          adminStyles.previewFrame,
          isNarrow ? adminStyles.previewFrameMobile : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          className={[
            adminStyles.previewCanvas,
            isNarrow ? adminStyles.previewCanvasMobile : "",
            isContact ? adminStyles.previewCanvasPage : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {isContact ? (
            <div className={adminStyles.previewPage}>
              <ContactPageView
                className={adminStyles.previewContactRoot}
                shellClassName={adminStyles.previewContactShell}
                showEmptySlots
                overlay={
                  <EditableHotspot id="contact-links" className={adminStyles.hotspotFill} />
                }
              />
              <PreviewWhatsAppFab />
            </div>
          ) : (
            <main className={[welcomeStyles.page, adminStyles.previewPage].filter(Boolean).join(" ")}>
              <div className={[welcomeStyles.landing, adminStyles.previewLanding].filter(Boolean).join(" ")}>
                <MediaCollage
                  heroAlt={strings.media.heroAlt}
                  portraitAlt={strings.media.portraitAlt}
                  handwritten={strings.aside.handwritten}
                  playCreateGrow={strings.aside.playCreateGrow}
                  established={strings.aside.established}
                  studioCaption={strings.aside.studioCaption}
                  motionCaption={strings.aside.motionCaption}
                  heroHotspot={
                    <EditableHotspot id="collage-hero" className={adminStyles.hotspotFill} />
                  }
                  portraitHotspot={
                    <EditableHotspot id="collage-portrait" className={adminStyles.hotspotFill} />
                  }
                />
                <AccentShapes />
                <SiteHeader
                  brand={strings.brand}
                  nav={strings.nav}
                  keywords={strings.header.keywords}
                />
                <HeroSection
                  hero={strings.hero}
                  creativity={strings.aside.creativity}
                  titleHotspot={
                    <EditableHotspot id="hero-title" className={adminStyles.hotspotFill} />
                  }
                />

                <PreviewWhatsAppFab />
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}
