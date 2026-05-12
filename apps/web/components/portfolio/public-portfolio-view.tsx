"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  GitBranch as Github,
  Mail,
  MapPin,
  Network as Linkedin,
} from "lucide-react";

import { API_BASE, asUploadUrl } from "@/lib/api";
import type {
  PublicPortfolio,
  PublicPortfolioProject,
} from "@/lib/types/portfolio";

export function PublicPortfolioView() {
  const [data, setData] = useState<PublicPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/portfolio/public`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PublicPortfolio;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur réseau");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Chargement...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-900">
            Portfolio indisponible
          </h1>
          <p className="text-slate-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || !data.public_enabled || !data.bio) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-900">
            Portfolio privé
          </h1>
          <p className="text-slate-600 mt-2">
            {data?.message ??
              "Ce portfolio n'est pas accessible publiquement pour le moment."}
          </p>
        </div>
      </div>
    );
  }

  const { bio, projects } = data;
  const featuredProjects = projects.filter((p) => p.is_featured);
  const otherProjects = projects.filter((p) => !p.is_featured);

  const photoUrl = asUploadUrl(bio.photo_url);
  const cvUrl = asUploadUrl(bio.cv_url);

  return (
    <main className="min-h-screen">
      {/* HERO */}
      <section className="relative px-6 py-20 md:py-28 bg-gradient-to-br from-emerald-50 via-white to-blue-50 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12">
            {photoUrl && (
              <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden ring-4 ring-white shadow-xl shrink-0">
                <Image
                  src={photoUrl}
                  alt={bio.name ?? "Photo"}
                  fill
                  sizes="(min-width: 768px) 224px, 160px"
                  className="object-cover"
                  unoptimized
                  priority
                />
              </div>
            )}
            <div className="text-center md:text-left flex-1">
              {bio.name && (
                <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight font-display">
                  {bio.name}
                </h1>
              )}
              {bio.tagline && (
                <p className="text-xl md:text-2xl text-slate-600 mt-3">
                  {bio.tagline}
                </p>
              )}
              {bio.location && (
                <p className="text-sm text-slate-500 mt-4 inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" strokeWidth={2} />
                  {bio.location}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-6 justify-center md:justify-start">
                {cvUrl && (
                  <a
                    href={cvUrl}
                    download
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                  >
                    <Download className="h-4 w-4" strokeWidth={2} />
                    Télécharger CV
                  </a>
                )}
                {bio.github_url && (
                  <a
                    href={bio.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 rounded-lg border border-slate-200 transition-colors"
                  >
                    <Github className="h-4 w-4" strokeWidth={2} />
                    GitHub
                  </a>
                )}
                {bio.linkedin_url && (
                  <a
                    href={bio.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 rounded-lg border border-slate-200 transition-colors"
                  >
                    <Linkedin className="h-4 w-4" strokeWidth={2} />
                    LinkedIn
                  </a>
                )}
                {bio.email && (
                  <a
                    href={`mailto:${bio.email}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 rounded-lg border border-slate-200 transition-colors"
                  >
                    <Mail className="h-4 w-4" strokeWidth={2} />
                    Contact
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BIO */}
      {bio.bio && (
        <section className="px-6 py-16 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-6 font-display">
            À propos
          </h2>
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
            {bio.bio}
          </p>
        </section>
      )}

      {/* SKILLS */}
      {bio.skills.length > 0 && (
        <section className="px-6 py-16 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 font-display">
              Compétences
            </h2>
            <div className="flex flex-wrap gap-2">
              {bio.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PROJETS */}
      {projects.length > 0 && (
        <section className="px-6 py-16 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 font-display">
            Projets
          </h2>

          {featuredProjects.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {featuredProjects.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
          )}

          {otherProjects.length > 0 && (
            <>
              {featuredProjects.length > 0 && (
                <h3 className="text-xl font-semibold text-slate-700 mb-4 mt-12">
                  Autres projets
                </h3>
              )}
              <div className="grid md:grid-cols-3 gap-4">
                {otherProjects.map((project) => (
                  <ProjectCard
                    key={project.slug}
                    project={project}
                    compact
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* PARCOURS */}
      {(bio.education.length > 0 || bio.experience.length > 0) && (
        <section className="px-6 py-16 bg-slate-50">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
            {bio.education.length > 0 && (
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-6 font-display">
                  Formation
                </h2>
                <div className="space-y-4">
                  {bio.education.map((edu, i) => (
                    <div
                      key={i}
                      className="bg-white p-5 rounded-xl border border-slate-200"
                    >
                      <h3 className="font-semibold text-slate-900">
                        {edu.degree}
                      </h3>
                      <p className="text-sm text-slate-600">{edu.school}</p>
                      {edu.year && (
                        <p className="text-xs text-slate-500 mt-1">
                          {edu.year}
                        </p>
                      )}
                      {edu.description && (
                        <p className="text-sm text-slate-600 mt-2">
                          {edu.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {bio.experience.length > 0 && (
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-6 font-display">
                  Expérience
                </h2>
                <div className="space-y-4">
                  {bio.experience.map((exp, i) => (
                    <div
                      key={i}
                      className="bg-white p-5 rounded-xl border border-slate-200"
                    >
                      <h3 className="font-semibold text-slate-900">
                        {exp.role}
                      </h3>
                      <p className="text-sm text-slate-600">{exp.company}</p>
                      {exp.period && (
                        <p className="text-xs text-slate-500 mt-1">
                          {exp.period}
                        </p>
                      )}
                      {exp.description && (
                        <p className="text-sm text-slate-600 mt-2">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="px-6 py-12 border-t border-slate-200">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} {bio.name ?? "Portfolio"}.
          </p>
          <div className="flex items-center gap-4">
            {bio.github_url && (
              <a
                href={bio.github_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <Github
                  className="h-5 w-5 text-slate-600 hover:text-slate-900 transition-colors"
                  strokeWidth={2}
                />
              </a>
            )}
            {bio.linkedin_url && (
              <a
                href={bio.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
              >
                <Linkedin
                  className="h-5 w-5 text-slate-600 hover:text-slate-900 transition-colors"
                  strokeWidth={2}
                />
              </a>
            )}
            {bio.email && (
              <a href={`mailto:${bio.email}`} aria-label="Email">
                <Mail
                  className="h-5 w-5 text-slate-600 hover:text-slate-900 transition-colors"
                  strokeWidth={2}
                />
              </a>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}

function ProjectCard({
  project,
  compact = false,
}: {
  project: PublicPortfolioProject;
  compact?: boolean;
}) {
  const screenshot = asUploadUrl(project.screenshot_url);

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
      {screenshot && !compact && (
        <div className="relative aspect-video bg-slate-100 overflow-hidden">
          <Image
            src={screenshot}
            alt={project.name}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="p-5">
        <h3
          className={`font-bold text-slate-900 font-display ${
            compact ? "text-base" : "text-xl"
          }`}
        >
          {project.name}
        </h3>
        {project.description_short && (
          <p className="text-sm text-slate-600 mt-2">
            {project.description_short}
          </p>
        )}
        {project.tech_stack.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {project.tech_stack.map((tech) => (
              <span
                key={tech}
                className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 mt-4">
          {project.demo_url && (
            <a
              href={project.demo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-800"
            >
              Démo
              <ExternalLink className="h-3 w-3" strokeWidth={2} />
            </a>
          )}
          {project.repo_url && (
            <a
              href={project.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
            >
              Code
              <Github className="h-3 w-3" strokeWidth={2} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
