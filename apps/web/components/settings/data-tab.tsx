"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Download, FileJson, Upload } from "lucide-react";

const API_BASE = "http://localhost:8000";

export function DataTab() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/data/export`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kiwi-os-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(
        `Erreur lors de l'export : ${
          e instanceof Error ? e.message : "Erreur réseau"
        }`,
      );
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = confirm(
      `Importer "${file.name}" et REMPLACER toutes les données actuelles ?\n\n` +
        `Cette action est irréversible. Fais un export de sauvegarde avant.`,
    );
    if (!confirmed) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${API_BASE}/api/settings/data/import?confirm_replace=true`,
        { method: "POST", body: formData },
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as { message?: string; total?: number };
      setImportResult({
        ok: true,
        message: data.message ?? `Importé ${data.total ?? 0} entités`,
      });
    } catch (err) {
      setImportResult({
        ok: false,
        message: `Erreur : ${
          err instanceof Error ? err.message : "Erreur réseau"
        }`,
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1 font-display">
          Données
        </h2>
        <p className="text-sm text-slate-600">
          Exporter ou importer toutes tes données Kiwi OS.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Download
              className="h-5 w-5 text-emerald-700"
              strokeWidth={1.5}
            />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900">
              Exporter mes données
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Télécharge un fichier JSON contenant toutes tes données :
              candidatures, tâches, sessions Pomodoro, comptes, transactions,
              abonnements, budgets et préférences.
            </p>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg disabled:opacity-50 transition-colors"
            >
              <Download className="h-4 w-4" strokeWidth={2} />
              {exporting ? "Export en cours..." : "Télécharger l'export"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Upload className="h-5 w-5 text-amber-700" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900">
              Importer un export
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Restaure tes données depuis un fichier JSON précédemment exporté.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertTriangle
                className="h-4 w-4 text-amber-600 shrink-0 mt-0.5"
                strokeWidth={2}
              />
              <p className="text-xs text-amber-800">
                <strong>Attention :</strong> l&apos;import remplace TOUTES les
                données actuelles. Fais un export de sauvegarde avant.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImport}
              disabled={importing}
              className="hidden"
              id="import-file-input"
            />
            <label
              htmlFor="import-file-input"
              className={`inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-lg cursor-pointer transition-colors ${
                importing ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <FileJson className="h-4 w-4" strokeWidth={2} />
              {importing ? "Import en cours..." : "Choisir un fichier JSON"}
            </label>

            {importResult && (
              <p
                className={`text-sm mt-3 ${
                  importResult.ok ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {importResult.ok ? "✓ " : ""}
                {importResult.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
