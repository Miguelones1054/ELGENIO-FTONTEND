"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { apiFetch, apiUpload } from "@/lib/api";
import { requireAdminToken } from "@/lib/admin-auth";
import { useAdminEditor } from "@/components/AdminEditorContext";
import { useSiteConfig, type AboutMember, type AboutPage } from "@/components/SiteConfigProvider";
import { compressImageFile } from "@/lib/image-compress";
import { resolveMediaUrl } from "@/lib/env";
import strings from "@/assets/strings/string-es.co.json";
import styles from "@/styles/admin.module.css";

const pageCopy = strings.pages.nosotros;

const emptyPage = (): AboutPage => ({
  cover: {
    imageUrl: "",
    headline: pageCopy.headline,
    description: pageCopy.copy,
  },
  members: [],
});

function memberId() {
  return `member_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

async function uploadImage(file: File) {
  const token = requireAdminToken();
  const payload = await compressImageFile(file, { maxDimension: 2400, quality: 0.86 });
  const formData = new FormData();
  formData.append("file", payload);
  formData.append("kind", "image");
  const res = await apiUpload<{ url: string }>("/administrative-content/portfolio/upload", formData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.url;
}

export function AboutManager() {
  const { reload } = useSiteConfig();
  const { setAboutDraft } = useAdminEditor();
  const [page, setPage] = useState<AboutPage>(emptyPage());
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [memberFiles, setMemberFiles] = useState<Record<string, File>>({});
  const [memberPreviews, setMemberPreviews] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = requireAdminToken();
        const data = await apiFetch<AboutPage>("/administrative-content/about", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled && data?.cover) {
          setPage({
            cover: {
              imageUrl: data.cover.imageUrl || "",
              headline: data.cover.headline || pageCopy.headline,
              description: data.cover.description || pageCopy.copy,
            },
            members: data.members || [],
          });
        }
      } catch {
        if (!cancelled) setPage(emptyPage());
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setAboutDraft({
      cover: {
        ...page.cover,
        imageUrl: coverPreview || page.cover.imageUrl,
      },
      members: page.members.map((member) => ({
        ...member,
        imageUrl: memberPreviews[member.id] || member.imageUrl,
      })),
    });
  }, [page, coverPreview, memberPreviews, setAboutDraft]);

  function showToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 4000);
  }

  function addMember() {
    setPage((current) => ({
      ...current,
      members: [
        ...current.members,
        { id: memberId(), name: "", role: "", description: "", imageUrl: "", order: current.members.length },
      ],
    }));
  }

  function updateMember(id: string, patch: Partial<AboutMember>) {
    setPage((current) => ({
      ...current,
      members: current.members.map((member) => (member.id === id ? { ...member, ...patch } : member)),
    }));
  }

  function removeMember(id: string) {
    setPage((current) => ({
      ...current,
      members: current.members.filter((member) => member.id !== id),
    }));
  }

  function onCoverFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function onMemberFile(id: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMemberFiles((current) => ({ ...current, [id]: file }));
    setMemberPreviews((current) => ({ ...current, [id]: URL.createObjectURL(file) }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      let imageUrl = page.cover.imageUrl;
      if (coverFile) imageUrl = await uploadImage(coverFile);
      const members: AboutMember[] = [];
      for (const [index, member] of page.members.entries()) {
        let photo = member.imageUrl;
        const file = memberFiles[member.id];
        if (file) photo = await uploadImage(file);
        if (!member.name.trim()) continue;
        members.push({ ...member, imageUrl: photo, order: index });
      }
      const token = requireAdminToken();
      const saved = await apiFetch<AboutPage>("/administrative-content/about", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          cover: { ...page.cover, imageUrl },
          members,
        }),
      });
      setPage({
        cover: saved.cover || { ...page.cover, imageUrl },
        members: saved.members || members,
      });
      setCoverFile(null);
      setCoverPreview(null);
      setMemberFiles({});
      setMemberPreviews({});
      await reload();
      showToast("Página Nosotros guardada.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.aboutEditor} onSubmit={save}>
      <div className={styles.aboutEditorHead}>
        <div>
          <h2 className={styles.portfolioPreviewTitle}>Personalizar Nosotros</h2>
          <p className={styles.portfolioPreviewCopy}>
            La portada y las tarjetas del equipo se ven arriba antes de guardar.
          </p>
        </div>
        <button className={styles.editorPrimary} type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar página"}
        </button>
      </div>
      {toast ? <p className={styles.aboutToast}>{toast}</p> : null}

      <div className={styles.aboutGrid}>
        <section className={styles.aboutCard}>
          <h3>Portada</h3>
          <label className={styles.fieldLabel} htmlFor="about-headline">
            Título
          </label>
          <input
            id="about-headline"
            className={styles.textInput}
            value={page.cover.headline}
            onChange={(event) => setPage({ ...page, cover: { ...page.cover, headline: event.target.value } })}
          />
          <label className={styles.fieldLabel} htmlFor="about-description">
            Descripción
          </label>
          <textarea
            id="about-description"
            className={styles.textInput}
            rows={4}
            value={page.cover.description}
            onChange={(event) =>
              setPage({ ...page, cover: { ...page.cover, description: event.target.value } })
            }
          />
          <label className={styles.fieldLabel} htmlFor="about-cover">
            Foto de portada
          </label>
          <input id="about-cover" type="file" accept="image/*" onChange={onCoverFile} />
          {coverPreview || page.cover.imageUrl ? (
            <img
              className={styles.aboutCoverPreview}
              src={coverPreview || resolveMediaUrl(page.cover.imageUrl)}
              alt=""
            />
          ) : null}
        </section>

        <section className={styles.aboutCard}>
          <div className={styles.aboutEditorHead}>
            <h3>Equipo</h3>
            <button className={styles.viewportBtn} type="button" onClick={addMember}>
              + Miembro
            </button>
          </div>
          {page.members.length === 0 ? <p className={styles.portfolioPreviewCopy}>Aún no hay tarjetas.</p> : null}
          <div className={styles.aboutMembers}>
            {page.members.map((member) => (
              <article key={member.id} className={styles.aboutMember}>
                <label className={styles.fieldLabel}>
                  Nombre
                  <input
                    className={styles.textInput}
                    value={member.name}
                    onChange={(event) => updateMember(member.id, { name: event.target.value })}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Cargo
                  <input
                    className={styles.textInput}
                    value={member.role}
                    onChange={(event) => updateMember(member.id, { role: event.target.value })}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Descripción
                  <textarea
                    className={styles.textInput}
                    rows={3}
                    value={member.description}
                    onChange={(event) => updateMember(member.id, { description: event.target.value })}
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Foto
                  <input type="file" accept="image/*" onChange={(event) => onMemberFile(member.id, event)} />
                </label>
                {memberPreviews[member.id] || member.imageUrl ? (
                  <img
                    className={styles.aboutMemberPhoto}
                    src={memberPreviews[member.id] || resolveMediaUrl(member.imageUrl)}
                    alt=""
                  />
                ) : null}
                <button className={styles.portfolioDeleteBtn} type="button" onClick={() => removeMember(member.id)}>
                  Quitar
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </form>
  );
}
