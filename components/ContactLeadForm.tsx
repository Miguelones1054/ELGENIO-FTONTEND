"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { apiFetch } from "@/lib/api";
import styles from "@/styles/contact-form.module.css";

type Step = 1 | 2 | "done";
type ClientType = "particular" | "empresa";

type FormState = {
  email: string;
  topic: string;
  clientType: ClientType;
  firstName: string;
  lastName: string;
  company: string;
  city: string;
  details: string;
};

const TOPICS = [
  { value: "proyectos", label: "Proyectos" },
  { value: "consulta", label: "Consulta general" },
];

const emptyForm = (): FormState => ({
  email: "",
  topic: "proyectos",
  clientType: "particular",
  firstName: "",
  lastName: "",
  company: "",
  city: "",
  details: "",
});

export function ContactLeadForm() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldError(null);
    setError(null);
  }

  function onContinue(event: FormEvent) {
    event.preventDefault();
    const email = form.email.trim();
    if (!email || !email.includes("@")) {
      setFieldError("Completa este campo");
      setError("Escribe un correo válido");
      return;
    }
    if (!form.topic) {
      setError("Elige una opción");
      return;
    }
    setStep(2);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiFetch("/contact-requests", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          topic: form.topic,
          clientType: form.clientType,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          company: form.clientType === "empresa" ? form.company.trim() : "",
          city: form.city.trim(),
          details: form.details.trim(),
        }),
      });
      setStep("done");
      setForm(emptyForm());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la solicitud");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.card}>
      {step === "done" ? (
        <div className={styles.success}>
          <h2 className={styles.title}>¡Listo!</h2>
          <p className={styles.successCopy}>
            Recibimos tu solicitud. Te contactaremos pronto al correo que nos compartiste.
          </p>
          <button
            className={styles.primary}
            type="button"
            onClick={() => {
              setStep(1);
              setError(null);
            }}
          >
            Enviar otra
            <Icon id="actions/chevron-right" className={styles.arrow} />
          </button>
        </div>
      ) : null}

      {step === 1 ? (
        <form className={styles.form} onSubmit={onContinue} noValidate>
          <h2 className={styles.title}>Contacta con nuestro equipo</h2>

          <label className={styles.field}>
            <span className={styles.label}>
              Correo electrónico de trabajo <span className={styles.req}>*</span>
            </span>
            <input
              className={[styles.input, fieldError ? styles.inputError : ""].filter(Boolean).join(" ")}
              type="email"
              autoComplete="email"
              placeholder="hola@tuempresa.co"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
            />
            {fieldError ? <span className={styles.fieldHint}>{fieldError}</span> : null}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              ¿En qué podemos ayudarte? <span className={styles.req}>*</span>
            </span>
            <select
              className={styles.select}
              value={form.topic}
              onChange={(event) => update("topic", event.target.value)}
            >
              {TOPICS.map((topic) => (
                <option key={topic.value} value={topic.value}>
                  {topic.label}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}

          <button className={styles.primary} type="submit">
            Continuar
            <Icon id="actions/chevron-right" className={styles.arrow} />
          </button>
        </form>
      ) : null}

      {step === 2 ? (
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <h2 className={styles.title}>Contacta con nuestro equipo</h2>

          <fieldset className={styles.fieldset}>
            <legend className={styles.label}>
              ¿Quién eres? <span className={styles.req}>*</span>
            </legend>
            <div className={styles.radioRow}>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="clientType"
                  checked={form.clientType === "particular"}
                  onChange={() => update("clientType", "particular")}
                />
                <span>Persona particular</span>
              </label>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="clientType"
                  checked={form.clientType === "empresa"}
                  onChange={() => update("clientType", "empresa")}
                />
                <span>Empresa</span>
              </label>
            </div>
          </fieldset>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>
                Nombre <span className={styles.req}>*</span>
              </span>
              <input
                className={styles.input}
                value={form.firstName}
                autoComplete="given-name"
                onChange={(event) => update("firstName", event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>
                Apellido <span className={styles.req}>*</span>
              </span>
              <input
                className={styles.input}
                value={form.lastName}
                autoComplete="family-name"
                onChange={(event) => update("lastName", event.target.value)}
              />
            </label>
          </div>

          {form.clientType === "empresa" ? (
            <label className={styles.field}>
              <span className={styles.label}>
                Empresa <span className={styles.req}>*</span>
              </span>
              <input
                className={styles.input}
                value={form.company}
                autoComplete="organization"
                onChange={(event) => update("company", event.target.value)}
              />
            </label>
          ) : null}

          <label className={styles.field}>
            <span className={styles.label}>
              Desde qué ciudad nos escribes <span className={styles.req}>*</span>
            </span>
            <input
              className={styles.input}
              value={form.city}
              autoComplete="address-level2"
              onChange={(event) => update("city", event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              Detalles del proyecto <span className={styles.req}>*</span>
            </span>
            <textarea
              className={styles.textarea}
              rows={4}
              placeholder="Cuéntanos qué te gustaría grabar"
              value={form.details}
              onChange={(event) => update("details", event.target.value)}
            />
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.actions}>
            <button
              className={styles.secondary}
              type="button"
              onClick={() => {
                setStep(1);
                setError(null);
              }}
            >
              Atrás
            </button>
            <button className={styles.primary} type="submit" disabled={saving}>
              {saving ? "Enviando…" : "Enviar"}
              <Icon id="actions/chevron-right" className={styles.arrow} />
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
