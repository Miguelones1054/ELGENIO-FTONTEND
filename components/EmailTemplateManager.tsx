"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-auth";
import styles from "@/styles/admin.module.css";

export type EmailTemplate = {
  subject: string;
  headline: string;
  body: string;
  buttonText: string;
  buttonUrl: string;
  footerText: string;
};

const DEFAULT_TEMPLATE: EmailTemplate = {
  subject: "¡Recibimos tu solicitud! | El Genio",
  headline: "¡Hola, {{firstName}}!",
  body: "Gracias por ponerte en contacto con El Genio Creativo. Hemos recibido tu solicitud para \"{{topic}}\" y nuestro equipo ya está revisándola. Te responderemos lo más pronto posible para conversar sobre tu proyecto.",
  buttonText: "Explorar El Genio",
  buttonUrl: "https://elgenio.co",
  footerText: "El Genio Creativo — Convertimos ideas en contenido que conecta, inspira y genera resultados.",
};

const DUMMY_DATA = {
  firstName: "Andrés",
  lastName: "Gómez",
  topic: "Producción de Video Comercial",
  city: "Medellín",
  company: "Mi Marca S.A.S.",
  details: "Buscamos crear una serie de videos dinámicos para redes sociales y pauta digital.",
};

const VARIABLES = [
  { tag: "{{firstName}}", label: "Nombre" },
  { tag: "{{lastName}}", label: "Apellido" },
  { tag: "{{topic}}", label: "Tema de interés" },
  { tag: "{{city}}", label: "Ciudad" },
  { tag: "{{company}}", label: "Empresa" },
  { tag: "{{details}}", label: "Mensaje/Detalles" },
];

export function EmailTemplateManager() {
  const [template, setTemplate] = useState<EmailTemplate>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = requireAdminToken();
        const data = await apiFetch<EmailTemplate>(
          "/administrative-content/email-template",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!cancelled && data) {
          setTemplate({
            subject: data.subject || DEFAULT_TEMPLATE.subject,
            headline: data.headline || DEFAULT_TEMPLATE.headline,
            body: data.body || DEFAULT_TEMPLATE.body,
            buttonText: data.buttonText || DEFAULT_TEMPLATE.buttonText,
            buttonUrl: data.buttonUrl || DEFAULT_TEMPLATE.buttonUrl,
            footerText: data.footerText || DEFAULT_TEMPLATE.footerText,
          });
        }
      } catch {
        // Usa por defecto si no ha sido configurado en el backend
        if (!cancelled) {
          setTemplate(DEFAULT_TEMPLATE);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const token = requireAdminToken();
      await apiFetch<EmailTemplate>("/administrative-content/email-template", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(template),
      });
      setFeedback({ type: "success", text: "¡Plantilla guardada correctamente!" });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "No se pudo guardar la plantilla",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    if (!testEmail.trim()) {
      setFeedback({ type: "error", text: "Ingresa un correo para enviar la prueba" });
      return;
    }

    setSendingTest(true);
    setFeedback(null);

    try {
      const token = requireAdminToken();
      const res = await apiFetch<{ ok: boolean; message: string }>(
        "/administrative-content/email-template/test",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: testEmail, template }),
        },
      );
      setFeedback({ type: "success", text: res.message || `Prueba enviada a ${testEmail}` });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Error enviando correo de prueba",
      });
    } finally {
      setSendingTest(false);
    }
  }

  function renderPreviewText(text: string) {
    return text
      .replaceAll("{{firstName}}", DUMMY_DATA.firstName)
      .replaceAll("{{lastName}}", DUMMY_DATA.lastName)
      .replaceAll("{{topic}}", DUMMY_DATA.topic)
      .replaceAll("{{city}}", DUMMY_DATA.city)
      .replaceAll("{{company}}", DUMMY_DATA.company)
      .replaceAll("{{details}}", DUMMY_DATA.details);
  }

  function insertTag(field: keyof EmailTemplate, tag: string) {
    setTemplate((prev) => ({
      ...prev,
      [field]: prev[field] ? `${prev[field]} ${tag}` : tag,
    }));
  }

  return (
    <section className={styles.emailPanel} aria-label="Plantilla de correo">
      <header className={styles.requestsHeader}>
        <div>
          <p className={styles.kicker}>Administrative content</p>
          <h2 className={styles.requestsTitle}>Plantilla de respuesta automática por correo</h2>
        </div>
        <p className={styles.requestsMeta}>
          {loading ? "Cargando…" : "Se envía automáticamente cuando un usuario envía el formulario"}
        </p>
      </header>

      {feedback ? (
        <div
          className={feedback.type === "success" ? styles.toastSuccess : styles.toastError}
          role="status"
        >
          {feedback.text}
        </div>
      ) : null}

      <div className={styles.emailLayout}>
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className={styles.emailFormCard}>
          <form onSubmit={handleSave} className={styles.emailForm}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="email-subject">
                Asunto del correo
              </label>
              <input
                id="email-subject"
                type="text"
                className={styles.textInput}
                value={template.subject}
                onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.fieldHeaderRow}>
                <label className={styles.fieldLabel} htmlFor="email-headline">
                  Título / Saludo principal
                </label>
                <div className={styles.miniTagGroup}>
                  {VARIABLES.slice(0, 2).map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      className={styles.miniTagBtn}
                      onClick={() => insertTag("headline", v.tag)}
                    >
                      +{v.tag}
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="email-headline"
                type="text"
                className={styles.textInput}
                value={template.headline}
                onChange={(e) => setTemplate({ ...template, headline: e.target.value })}
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.fieldHeaderRow}>
                <label className={styles.fieldLabel} htmlFor="email-body">
                  Cuerpo del mensaje
                </label>
                <div className={styles.miniTagGroup}>
                  {VARIABLES.map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      className={styles.miniTagBtn}
                      onClick={() => insertTag("body", v.tag)}
                    >
                      +{v.tag}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                id="email-body"
                className={styles.textAreaInput}
                rows={5}
                value={template.body}
                onChange={(e) => setTemplate({ ...template, body: e.target.value })}
                required
              />
            </div>

            <div className={styles.fieldRowTwo}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="email-btn-text">
                  Texto del botón
                </label>
                <input
                  id="email-btn-text"
                  type="text"
                  className={styles.textInput}
                  value={template.buttonText}
                  onChange={(e) => setTemplate({ ...template, buttonText: e.target.value })}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="email-btn-url">
                  Enlace del botón (URL)
                </label>
                <input
                  id="email-btn-url"
                  type="url"
                  className={styles.textInput}
                  value={template.buttonUrl}
                  onChange={(e) => setTemplate({ ...template, buttonUrl: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="email-footer">
                Pie de página / Frase de marca
              </label>
              <input
                id="email-footer"
                type="text"
                className={styles.textInput}
                value={template.footerText}
                onChange={(e) => setTemplate({ ...template, footerText: e.target.value })}
              />
            </div>

            <div className={styles.emailFormActions}>
              <button
                type="submit"
                className={styles.saveBtn}
                disabled={saving || loading}
              >
                {saving ? "Guardando cambios…" : "Guardar plantilla"}
              </button>
            </div>
          </form>

          {/* CAJA DE PRUEBA */}
          <div className={styles.testEmailBox}>
            <h4 className={styles.testEmailTitle}>📧 Probar envío de correo real</h4>
            <p className={styles.testEmailDesc}>
              Envía un correo de prueba a tu bandeja de entrada para verificar cómo se ve el diseño y que la contraseña de aplicación de Gmail esté funcionando.
            </p>
            <form onSubmit={handleSendTest} className={styles.testEmailForm}>
              <input
                type="email"
                placeholder="ejemplo@gmail.com"
                className={styles.testEmailInput}
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                className={styles.testEmailBtn}
                disabled={sendingTest}
              >
                {sendingTest ? "Enviando…" : "Enviar prueba"}
              </button>
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA: VISTA PREVIA EN VIVO */}
        <div className={styles.emailPreviewCard}>
          <div className={styles.emailPreviewHeader}>
            <div>
              <span className={styles.previewBadge}>Vista previa en vivo</span>
            </div>
            <div className={styles.viewportToggle}>
              <button
                type="button"
                className={[
                  styles.viewportBtn,
                  previewMode === "desktop" ? styles.viewportBtnActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setPreviewMode("desktop")}
              >
                Escritorio
              </button>
              <button
                type="button"
                className={[
                  styles.viewportBtn,
                  previewMode === "mobile" ? styles.viewportBtnActive : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setPreviewMode("mobile")}
              >
                Móvil
              </button>
            </div>
          </div>

          <div
            className={[
              styles.emailPreviewContainer,
              previewMode === "mobile" ? styles.emailPreviewMobile : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {/* INBOX CHROME HEADER */}
            <div className={styles.inboxTopBar}>
              <div className={styles.inboxDot} />
              <div className={styles.inboxDot} />
              <div className={styles.inboxDot} />
              <span className={styles.inboxSubject}>{renderPreviewText(template.subject)}</span>
            </div>

            {/* RENDERED EMAIL TEMPLATE */}
            <div className={styles.emailMailWrapper}>
              <div className={styles.emailMailContainer}>
                {/* Header */}
                <div className={styles.emailMailHeader}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/email/logo-el-genio.png"
                    alt="El Genio"
                    className={styles.emailLogoImg}
                    width={88}
                    height={88}
                  />
                  <div className={styles.emailTagline}>Agencia Creativa</div>
                </div>

                {/* Content */}
                <div className={styles.emailMailContent}>
                  <h3 className={styles.emailHeadline}>{renderPreviewText(template.headline)}</h3>
                  <p className={styles.emailBodyCopy}>
                    {renderPreviewText(template.body)
                      .split("\n")
                      .map((paragraph, i) => (
                        <span key={i}>
                          {paragraph}
                          <br />
                        </span>
                      ))}
                  </p>

                  <div className={styles.emailSummaryCard}>
                    <div className={styles.emailSummaryTitle}>Resumen de tu solicitud</div>
                    <div className={styles.emailSummaryItem}>
                      <strong>Tema de interés:</strong> {DUMMY_DATA.topic}
                    </div>
                    <div className={styles.emailSummaryItem}>
                      <strong>Ciudad:</strong> {DUMMY_DATA.city}
                    </div>
                    <div className={styles.emailSummaryItem}>
                      <strong>Empresa:</strong> {DUMMY_DATA.company}
                    </div>
                  </div>

                  {template.buttonText ? (
                    <div className={styles.emailBtnWrapper}>
                      <a
                        href={template.buttonUrl || "https://elgenio.co"}
                        className={styles.emailCtaBtn}
                        onClick={(e) => e.preventDefault()}
                      >
                        {template.buttonText}
                      </a>
                    </div>
                  ) : null}
                </div>

                {/* Footer */}
                <div className={styles.emailMailFooter}>
                  <div className={styles.emailFooterBrand}>{template.footerText}</div>
                  <div className={styles.emailFooterCopy}>
                    &copy; {new Date().getFullYear()} El Genio. Todos los derechos reservados.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
