"use client";

import { authFetch } from "@/lib/auth-fetch";
import Image from "next/image";
import { useState } from "react";
import {
  Edit,
  Eye,
  EyeOff,
  ExternalLink,
  GitBranch as Github,
  Image as ImageIcon,
  Plus,
  Star,
  Trash2,
} from "lucide-react";

import { ProjectFormModal } from "@/components/portfolio/project-form-modal";
import { API_BASE, asUploadUrl } from "@/lib/api";
import type { PortfolioProject } from "@/lib/types/portfolio";

interface Props {
  projects: PortfolioProject[];
  onRefresh: () => void;
}

export function ProjectsTab({ projects, onRefresh }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioProject | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (project: PortfolioProject) => {
    setEditing(project);
    setModalOpen(true);
  };

  const toggleFlag = async (
    project: PortfolioProject,
    field: "is_visible" | "is_featured",
  ) => {
    try {
      const res = await authFetch(
        `${API_BASE}/api/portfolio/projects/${project.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: !project[field] }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onRefresh();
    } catch (e) {
      alert(
        `Erreur : ${e instanceof Error ? e.message : "Erreur rÃ©seau"}`,
      );
    }
  };

  const remove = async (project: PortfolioProject) => {
    if (!confirm(`Supprimer le projet "${project.name}" ?`)) return;
    try {
      const res = await authFetch(
        `${API_BASE}/api/portfolio/projects/${project.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onRefresh();
    } catch (e) {
      alert(
        `Erreur suppression : ${e instanceof Error ? e.message : "Erreur rÃ©seau"}`,
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1 font-display">
            Projets
          </h2>
          <p className="text-sm text-slate-600">
            Les projets affichÃ©s sur ta page publique (avec le toggle Visible
            cochÃ©).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Nouveau projet
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-slate-600">Aucun projet pour l&apos;instant.</p>
          <p className="text-sm text-slate-500 mt-1">
            Clique sur &ldquo;Nouveau projet&rdquo; ou utilise &ldquo;Sync
            GitHub&rdquo; en haut pour importer tes repos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => {
            const screenshot = asUploadUrl(project.screenshot_url);
            return (
              <article
                key={project.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-video bg-slate-50 flex items-center justify-center">
                  {screenshot ? (
                    <Image
                      src={screenshot}
                      alt={project.name}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <ImageIcon
                      className="h-10 w-10 text-slate-300"
                      strokeWidth={1.5}
                    />
                  )}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {project.is_featured && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-200">
                        <Star
                          className="h-3 w-3 fill-amber-500 text-amber-500"
                          strokeWidth={2}
                        />
                        Featured
                      </span>
                    )}
                    {!project.is_visible && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full border border-slate-200">
                        <EyeOff className="h-3 w-3" strokeWidth={2} />
                        CachÃ©
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {project.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono truncate">
                        {project.slug}
                      </p>
                    </div>
                  </div>

                  {project.description_short && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                      {project.description_short}
                    </p>
                  )}

                  {project.tech_stack.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {project.tech_stack.slice(0, 5).map((tech) => (
                        <span
                          key={tech}
                          className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200"
                        >
                          {tech}
                        </span>
                      ))}
                      {project.tech_stack.length > 5 && (
                        <span className="px-1.5 py-0.5 text-xs text-slate-500">
                          +{project.tech_stack.length - 5}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {project.repo_url && (
                        <a
                          href={project.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-slate-900"
                        >
                          <Github className="h-3 w-3" strokeWidth={2} />
                          Repo
                        </a>
                      )}
                      {project.demo_url && (
                        <a
                          href={project.demo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:text-emerald-700"
                        >
                          <ExternalLink className="h-3 w-3" strokeWidth={2} />
                          DÃ©mo
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleFlag(project, "is_featured")}
                        title={
                          project.is_featured
                            ? "Retirer des featured"
                            : "Mettre en vedette"
                        }
                        className={`p-1.5 rounded transition-colors ${
                          project.is_featured
                            ? "text-amber-600 hover:bg-amber-50"
                            : "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                        }`}
                      >
                        <Star
                          className={`h-4 w-4 ${project.is_featured ? "fill-amber-500" : ""}`}
                          strokeWidth={2}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleFlag(project, "is_visible")}
                        title={
                          project.is_visible
                            ? "Cacher du public"
                            : "Rendre visible"
                        }
                        className="p-1.5 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        {project.is_visible ? (
                          <Eye className="h-4 w-4" strokeWidth={2} />
                        ) : (
                          <EyeOff className="h-4 w-4" strokeWidth={2} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(project)}
                        title="Modifier"
                        className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      >
                        <Edit className="h-4 w-4" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(project)}
                        title="Supprimer"
                        className="p-1.5 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ProjectFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onRefresh}
        initialProject={editing}
      />
    </div>
  );
}
