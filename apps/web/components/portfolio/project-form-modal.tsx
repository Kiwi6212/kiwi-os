"use client";

import { authFetch } from "@/lib/auth-fetch";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Image as ImageIcon, Plus, Trash2, X } from "lucide-react";

import { API_BASE, asUploadUrl } from "@/lib/api";
import type { PortfolioProject } from "@/lib/types/portfolio";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialProject: PortfolioProject | null;
}

const INPUT_CLASS =
  "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const LABEL_CLASS =
  "block text-xs uppercase tracking-wider text-slate-500 mb-2";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProjectFormModal({
  isOpen,
  onClose,
  onSaved,
  initialProject,
}: Props) {
  const isEdit = initialProject !== null;
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [descShort, setDescShort] = useState("");
  const [descLong, setDescLong] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techDraft, setTechDraft] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [order, setOrder] = useState(0);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isOpen) return;
    if (initialProject) {
      setName(initialProject.name);
      setSlug(initialProject.slug);
      setSlugTouched(true);
      setDescShort(initialProject.description_short ?? "");
      setDescLong(initialProject.description_long ?? "");
      setDemoUrl(initialProject.demo_url ?? "");
      setRepoUrl(initialProject.repo_url ?? "");
      setTechStack(initialProject.tech_stack ?? []);
      setIsFeatured(initialProject.is_featured);
      setIsVisible(initialProject.is_visible);
      setOrder(initialProject.order);
      setScreenshotPreview(asUploadUrl(initialProject.screenshot_url));
    } else {
      setName("");
      setSlug("");
      setSlugTouched(false);
      setDescShort("");
      setDescLong("");
      setDemoUrl("");
      setRepoUrl("");
      setTechStack([]);
      setIsFeatured(false);
      setIsVisible(true);
      setOrder(0);
      setScreenshotPreview(null);
    }
    setError(null);
    setTechDraft("");
  }, [isOpen, initialProject]);

  if (!isOpen) return null;

  const handleNameChange = (next: string) => {
    setName(next);
    if (!slugTouched) setSlug(slugify(next));
  };

  const addTech = () => {
    const trimmed = techDraft.trim();
    if (!trimmed || techStack.includes(trimmed)) return;
    setTechStack([...techStack, trimmed]);
    setTechDraft("");
  };

  const removeTech = (tech: string) =>
    setTechStack(techStack.filter((t) => t !== tech));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom est obligatoire");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description_short: descShort.trim() || null,
        description_long: descLong.trim() || null,
        demo_url: demoUrl.trim() || null,
        repo_url: repoUrl.trim() || null,
        tech_stack: techStack,
        is_featured: isFeatured,
        is_visible: isVisible,
        order,
      };
      const url = isEdit
        ? `${API_BASE}/api/portfolio/projects/${initialProject!.id}`
        : `${API_BASE}/api/portfolio/projects`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `HTTP ${res.status}`);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleScreenshotUpload = async (file: File) => {
    if (!initialProject) {
      alert(
        "Enregistre d'abord le projet pour pouvoir uploader un screenshot.",
      );
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await authFetch(
        `${API_BASE}/api/portfolio/projects/${initialProject.id}/screenshot`,
        { method: "POST", body: fd },
      );
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `HTTP ${res.status}`);
      }
      const updated = (await res.json()) as PortfolioProject;
      setScreenshotPreview(asUploadUrl(updated.screenshot_url));
      onSaved();
    } catch (e) {
      alert(
        `Erreur upload : ${e instanceof Error ? e.message : "Erreur rÃ©seau"}`,
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <h2 className="text-lg font-semibold text-slate-900 font-display">
            {isEdit ? "Modifier le projet" : "Nouveau projet"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-slate-500 hover:text-slate-900 p-1 rounded"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>Nom *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Kiwi OS"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                placeholder="kiwi-os"
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Description courte</label>
            <input
              type="text"
              value={descShort}
              onChange={(e) => setDescShort(e.target.value)}
              placeholder="Personal cockpit aggregating my dev / finance / job activity."
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Description longue (markdown)</label>
            <textarea
              rows={5}
              value={descLong}
              onChange={(e) => setDescLong(e.target.value)}
              placeholder="DÃ©taille le contexte, les choix techniques, le rÃ©sultat."
              className={`${INPUT_CLASS} resize-y`}
            />
          </div>

          {isEdit && (
            <div>
              <label className={LABEL_CLASS}>Screenshot</label>
              <div className="flex items-center gap-4">
                <div className="relative w-32 h-20 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {screenshotPreview ? (
                    <Image
                      src={screenshotPreview}
                      alt="Screenshot"
                      fill
                      sizes="128px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <ImageIcon
                      className="h-6 w-6 text-slate-400"
                      strokeWidth={1.5}
                    />
                  )}
                </div>
                <input
                  ref={screenshotInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleScreenshotUpload(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => screenshotInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-50"
                >
                  {uploading ? "Upload..." : "Changer"}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>URL de dÃ©mo</label>
              <input
                type="url"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://demo.example.com"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>URL du repo</label>
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/..."
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Stack technique</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={techDraft}
                onChange={(e) => setTechDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTech();
                  }
                }}
                placeholder="React (EntrÃ©e)"
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={addTech}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            {techStack.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {techStack.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200"
                  >
                    {tech}
                    <button
                      type="button"
                      onClick={() => removeTech(tech)}
                      className="p-0.5 hover:bg-emerald-100 rounded"
                      aria-label={`Retirer ${tech}`}
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={2} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <label className="flex items-center gap-2 text-sm text-slate-900">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              En vedette
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-900">
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => setIsVisible(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              Visible publiquement
            </label>
            <div>
              <label className={LABEL_CLASS}>Ordre</label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value || "0", 10))}
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving
                ? isEdit
                  ? "Sauvegarde..."
                  : "CrÃ©ation..."
                : isEdit
                  ? "Enregistrer"
                  : "CrÃ©er"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
