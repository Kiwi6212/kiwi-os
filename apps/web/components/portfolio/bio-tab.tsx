"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  ExternalLink,
  FileText,
  Plus,
  Save,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";

import { API_BASE, asUploadUrl } from "@/lib/api";
import type {
  EducationEntry,
  ExperienceEntry,
  PortfolioBio,
} from "@/lib/types/portfolio";

interface Props {
  bio: PortfolioBio;
  onUpdate: (next: PortfolioBio) => void;
}

const INPUT_CLASS =
  "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const LABEL_CLASS =
  "block text-xs uppercase tracking-wider text-slate-500 mb-2";

export function BioTab({ bio, onUpdate }: Props) {
  const [name, setName] = useState(bio.name ?? "");
  const [tagline, setTagline] = useState(bio.tagline ?? "");
  const [bioText, setBioText] = useState(bio.bio ?? "");
  const [email, setEmail] = useState(bio.email ?? "");
  const [githubUrl, setGithubUrl] = useState(bio.github_url ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(bio.linkedin_url ?? "");
  const [location, setLocation] = useState(bio.location ?? "");
  const [skills, setSkills] = useState<string[]>(bio.skills ?? []);
  const [skillDraft, setSkillDraft] = useState("");
  const [education, setEducation] = useState<EducationEntry[]>(
    bio.education ?? [],
  );
  const [experience, setExperience] = useState<ExperienceEntry[]>(
    bio.experience ?? [],
  );
  const [publicEnabled, setPublicEnabled] = useState(bio.public_enabled);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"photo" | "cv" | null>(null);

  const addSkill = () => {
    const trimmed = skillDraft.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    setSkills([...skills, trimmed]);
    setSkillDraft("");
  };

  const removeSkill = (skill: string) =>
    setSkills(skills.filter((s) => s !== skill));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await authFetch(`/api/portfolio/bio`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          tagline: tagline.trim() || null,
          bio: bioText.trim() || null,
          email: email.trim() || null,
          github_url: githubUrl.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          location: location.trim() || null,
          skills,
          education,
          experience,
          public_enabled: publicEnabled,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = (await res.json()) as PortfolioBio;
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (
    kind: "photo" | "cv",
    file: File,
  ): Promise<void> => {
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const path = kind === "photo" ? "photo" : "cv";
      const res = await authFetch(`/api/portfolio/bio/${path}`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `HTTP ${res.status}`);
      }
      const updated = (await res.json()) as PortfolioBio;
      onUpdate(updated);
    } catch (e) {
      alert(
        `Erreur upload : ${e instanceof Error ? e.message : "Erreur réseau"}`,
      );
    } finally {
      setUploading(null);
    }
  };

  const photoUrl = asUploadUrl(bio.photo_url);
  const cvUrl = asUploadUrl(bio.cv_url);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1 font-display">
          Bio &amp; Identité
        </h2>
        <p className="text-sm text-slate-600">
          Toutes les infos affichées sur la vitrine publique.
        </p>
      </div>

      {/* Identité */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Identité</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Nom complet</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mathias Quillateau"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Localisation</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Paris, France"
              className={INPUT_CLASS}
            />
          </div>
        </div>
        <div>
          <label className={LABEL_CLASS}>Tagline</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Alternant cybersécurité &amp; développeur full-stack"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Bio (markdown supporté)</label>
          <textarea
            rows={6}
            value={bioText}
            onChange={(e) => setBioText(e.target.value)}
            placeholder="Quelques paragraphes pour te présenter..."
            className={`${INPUT_CLASS} resize-y`}
          />
        </div>
      </section>

      {/* Médias */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Médias</h3>

        <div>
          <label className={LABEL_CLASS}>Photo de profil</label>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt="Photo de profil"
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <UserIcon
                  className="h-10 w-10 text-slate-400"
                  strokeWidth={1.5}
                />
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadFile("photo", f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploading === "photo"}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              {uploading === "photo" ? "Upload..." : "Changer la photo"}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            JPEG, PNG, WebP ou GIF, max 5 MB.
          </p>
        </div>

        <div>
          <label className={LABEL_CLASS}>CV (PDF)</label>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
              <FileText className="h-4 w-4 text-slate-500" strokeWidth={2} />
              {cvUrl ? (
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-emerald-700"
                >
                  Voir le CV actuel
                  <ExternalLink className="h-3 w-3" strokeWidth={2} />
                </a>
              ) : (
                <span className="text-slate-500">Aucun CV pour l&apos;instant</span>
              )}
            </div>
            <input
              ref={cvInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadFile("cv", f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => cvInputRef.current?.click()}
              disabled={uploading === "cv"}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              {uploading === "cv" ? "Upload..." : "Uploader un CV"}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">PDF, max 10 MB.</p>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mathias@example.com"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>GitHub URL</label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/Kiwi6212"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>LinkedIn URL</label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </section>

      {/* Compétences */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Compétences</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={skillDraft}
            onChange={(e) => setSkillDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="Ajouter une compétence (Entrée)"
            className={INPUT_CLASS}
          />
          <button
            type="button"
            onClick={addSkill}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Ajouter
          </button>
        </div>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 bg-emerald-50 text-emerald-700 text-sm rounded-full border border-emerald-200"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="ml-1 p-0.5 hover:bg-emerald-100 rounded-full"
                  aria-label={`Retirer ${skill}`}
                >
                  <Trash2 className="h-3 w-3" strokeWidth={2} />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Formation */}
      <EntryListEditor
        title="Formation"
        entries={education}
        onChange={setEducation}
        fields={[
          { key: "school", label: "École", placeholder: "Université..." },
          { key: "degree", label: "Diplôme", placeholder: "Master..." },
          { key: "year", label: "Période", placeholder: "2022 – 2024" },
          {
            key: "description",
            label: "Description",
            placeholder: "Détails optionnels",
            textarea: true,
          },
        ]}
      />

      {/* Expérience */}
      <EntryListEditor
        title="Expérience"
        entries={experience}
        onChange={setExperience}
        fields={[
          { key: "company", label: "Entreprise", placeholder: "Nom de la société" },
          { key: "role", label: "Poste", placeholder: "Alternant DevOps" },
          { key: "period", label: "Période", placeholder: "2024 – aujourd'hui" },
          {
            key: "description",
            label: "Description",
            placeholder: "Missions principales",
            textarea: true,
          },
        ]}
      />

      {/* Visibilité */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Visibilité publique
        </h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={publicEnabled}
            onChange={(e) => setPublicEnabled(e.target.checked)}
            className="h-4 w-4 accent-emerald-600"
          />
          <span className="text-sm text-slate-900">
            Rendre mon portfolio accessible publiquement (URL /portfolio-public)
          </span>
        </label>
        <p className="text-xs text-slate-500 mt-2">
          Décoché : la page publique affiche un message &ldquo;portfolio privé&rdquo;.
        </p>
      </section>

      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 sticky bottom-4">
        <div className="flex items-center gap-3 bg-white/85 backdrop-blur-sm border border-slate-200 rounded-full px-4 py-2 shadow-md">
          {saved && (
            <span className="text-sm text-emerald-600">✓ Enregistré</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" strokeWidth={2} />
            {saving ? "Sauvegarde..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Generic dynamic list editor (education / experience) ----------

type FieldDef<T> = {
  key: keyof T & string;
  label: string;
  placeholder: string;
  textarea?: boolean;
};

interface EntryListEditorProps<T extends Record<string, unknown>> {
  title: string;
  entries: T[];
  onChange: (next: T[]) => void;
  fields: FieldDef<T>[];
}

function EntryListEditor<T extends Record<string, unknown>>({
  title,
  entries,
  onChange,
  fields,
}: EntryListEditorProps<T>) {
  const blank = Object.fromEntries(fields.map((f) => [f.key, ""])) as T;

  const update = (index: number, key: keyof T & string, value: string) => {
    const next = entries.map((entry, i) =>
      i === index ? { ...entry, [key]: value } : entry,
    );
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const add = () => onChange([...entries, blank]);

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Ajouter
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune entrée pour l&apos;instant.</p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, i) => (
            <div
              key={i}
              className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 uppercase tracking-wider">
                  Entrée #{i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-slate-500 hover:text-rose-600 p-1 rounded transition-colors"
                  aria-label="Supprimer l'entrée"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fields.map((field) => {
                  const value = (entry[field.key] as string | null) ?? "";
                  const colSpan = field.textarea
                    ? "md:col-span-2"
                    : "md:col-span-1";
                  return (
                    <div key={field.key} className={colSpan}>
                      <label className={LABEL_CLASS}>{field.label}</label>
                      {field.textarea ? (
                        <textarea
                          rows={2}
                          value={value}
                          onChange={(e) =>
                            update(i, field.key, e.target.value)
                          }
                          placeholder={field.placeholder}
                          className={`${INPUT_CLASS} resize-y`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            update(i, field.key, e.target.value)
                          }
                          placeholder={field.placeholder}
                          className={INPUT_CLASS}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
