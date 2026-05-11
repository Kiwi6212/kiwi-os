"use client";

import { Lock, Globe, ExternalLink } from "lucide-react";

type RepoContribution = {
  name: string;
  name_with_owner: string;
  url: string;
  is_private: boolean;
  commit_count: number;
};

interface RepoBreakdownProps {
  repos: RepoContribution[];
  title?: string;
}

export function RepoBreakdown({
  repos,
  title = "Répartition des commits",
}: RepoBreakdownProps) {
  const maxCount = Math.max(...repos.map((r) => r.commit_count), 1);

  return (
    <div className="space-y-3">
      <h3 className="text-xs uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      <div className="space-y-2.5">
        {repos.map((repo) => {
          const percentage = (repo.commit_count / maxCount) * 100;
          return (
            <a
              key={repo.name_with_owner}
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <div className="flex items-center justify-between mb-1 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {repo.is_private ? (
                    <Lock
                      className="h-3 w-3 text-slate-500 shrink-0"
                      strokeWidth={2}
                    />
                  ) : (
                    <Globe
                      className="h-3 w-3 text-slate-500 shrink-0"
                      strokeWidth={2}
                    />
                  )}
                  <span className="text-slate-700 group-hover:text-emerald-600 transition-colors truncate">
                    {repo.name}
                  </span>
                  <ExternalLink
                    className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    strokeWidth={2}
                  />
                </div>
                <span className="font-mono text-xs text-slate-500 shrink-0 ml-2">
                  {repo.commit_count}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-600/70 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
