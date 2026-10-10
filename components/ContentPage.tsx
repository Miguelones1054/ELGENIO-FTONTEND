import { AccentShapes } from "@/components/AccentShapes";
import { SiteHeader } from "@/components/SiteHeader";
import strings from "@/assets/strings/string-es.co.json";
import styles from "@/styles/welcome.module.css";

type ContentPageProps = {
  title: string;
  copy: string;
  side?: "left" | "right";
};

const SERVICES_DATA = [
  {
    index: "01 · Social & Growth",
    title: "Estrategia de Contenido",
    desc: "Reels de impacto, campañas digitales y narrativa visual recurrente para escalar la visibilidad y relevancia de tu marca.",
  },
  {
    index: "02 · Visual Art",
    title: "Fotografía Comercial",
    desc: "Sesiones de producto, moda, editorial y catálogo con estándares estéticos de nivel internacional e iluminación de set.",
  },
  {
    index: "03 · Post-Lab",
    title: "Color Grading & Montaje",
    desc: "Corrección de color cinematográfica, montaje dinámico de ritmo de alta atención y diseño sonoro inmersivo.",
  },
];

const ABOUT_DATA = [
  {
    index: "01 · Filosofía",
    title: "ADN Cinematográfico",
    desc: "Transformamos la visión de marcas audaces en experiencias visuales memorables que generan deseo e impacto inmediato.",
  },
  {
    index: "02 · Enfoque",
    title: "Estrategia Primero",
    desc: "No hacemos video por hacer video: cada segundo está ideado con propósito para conectar, emocionar y generar resultados comerciales.",
  },
];

export function ContentPage({ title, copy, side = "left" }: ContentPageProps) {
  const isServices = title.toLowerCase().includes("servicios");
  const isAbout = title.toLowerCase().includes("nosotros");

  const kicker = isServices
    ? "El Genio · Soluciones Audiovisuales"
    : isAbout
      ? "El Genio · Agencia Creativa"
      : "El Genio";

  const displayCopy =
    copy && copy !== "Sección en construcción."
      ? copy
      : isServices
        ? "Creamos contenido de alto impacto visual y estratégico para marcas que buscan sobresalir en un entorno saturado."
        : isAbout
          ? "Somos una agencia creativa y productora audiovisual donde el lenguaje cinematográfico se fusiona con la estrategia digital."
          : copy;

  return (
    <main className={styles.page}>
      <div className={styles.contentShell}>
        <SiteHeader
          brand={strings.brand}
          nav={strings.nav}
          keywords={strings.header.keywords}
          tone="page"
        />
        <section className={styles.section} aria-label={title}>
          <AccentShapes variant="section" side={side} />
          <div className={isServices || isAbout ? styles.sectionInnerWide : styles.sectionInner}>
            <p className={styles.sectionKicker}>{kicker}</p>
            <h1 className={styles.sectionTitle}>{title}</h1>
            <p className={styles.sectionCopy}>{displayCopy}</p>

            {isServices ? (
              <div className={styles.cardsGrid}>
                {SERVICES_DATA.map((service, index) => (
                  <article
                    key={service.index}
                    className={styles.cardItem}
                    style={{ animationDelay: `${260 + index * 60}ms` }}
                  >
                    <span className={styles.cardIndex}>{service.index}</span>
                    <h2 className={styles.cardTitle}>{service.title}</h2>
                    <p className={styles.cardDesc}>{service.desc}</p>
                  </article>
                ))}
              </div>
            ) : null}

            {isAbout ? (
              <div className={styles.cardsGrid}>
                {ABOUT_DATA.map((item, index) => (
                  <article
                    key={item.index}
                    className={styles.cardItem}
                    style={{ animationDelay: `${260 + index * 70}ms` }}
                  >
                    <span className={styles.cardIndex}>{item.index}</span>
                    <h2 className={styles.cardTitle}>{item.title}</h2>
                    <p className={styles.cardDesc}>{item.desc}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
