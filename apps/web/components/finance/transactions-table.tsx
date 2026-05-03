"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Edit, Trash2 } from "lucide-react";
import {
  type Account,
  type Category,
  type Transaction,
  type TransactionType,
  formatCurrency,
  formatDate,
} from "@/lib/types/finance";

export type TransactionFilters = {
  year: number;
  month: number;
  account_id: number | null;
  category_id: number | null;
  type: TransactionType | null;
  search: string;
};

interface Props {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  filters: TransactionFilters;
  onFiltersChange: (next: TransactionFilters) => void;
  offset: number;
  pageSize: number;
  onOffsetChange: (next: number) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => Promise<void>;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function buildMonthOptions(): Array<{ year: number; month: number; label: string }> {
  const today = new Date();
  const options: Array<{ year: number; month: number; label: string }> = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    options.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return options;
}

const TYPE_COLORS: Record<TransactionType, string> = {
  expense: "text-rose-400",
  income: "text-emerald-400",
  transfer: "text-slate-400",
};

export function TransactionsTable({
  transactions,
  accounts,
  categories,
  filters,
  onFiltersChange,
  offset,
  pageSize,
  onOffsetChange,
  onEdit,
  onDelete,
}: Props) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const monthOptions = buildMonthOptions();

  const hasFilters =
    filters.account_id !== null ||
    filters.category_id !== null ||
    filters.type !== null ||
    filters.search.trim() !== "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={`${filters.year}-${filters.month}`}
          onChange={(e) => {
            const [y, m] = e.target.value.split("-").map(Number);
            onFiltersChange({ ...filters, year: y, month: m });
            onOffsetChange(0);
          }}
          className="text-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300"
        >
          {monthOptions.map((o) => (
            <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={filters.account_id ?? ""}
          onChange={(e) => {
            onFiltersChange({
              ...filters,
              account_id: e.target.value ? parseInt(e.target.value, 10) : null,
            });
            onOffsetChange(0);
          }}
          className="text-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300"
        >
          <option value="">Tous comptes</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select
          value={filters.category_id ?? ""}
          onChange={(e) => {
            onFiltersChange({
              ...filters,
              category_id: e.target.value ? parseInt(e.target.value, 10) : null,
            });
            onOffsetChange(0);
          }}
          className="text-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300"
        >
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? `${c.icon} ` : ""}
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filters.type ?? ""}
          onChange={(e) => {
            onFiltersChange({
              ...filters,
              type: e.target.value ? (e.target.value as TransactionType) : null,
            });
            onOffsetChange(0);
          }}
          className="text-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300"
        >
          <option value="">Tous types</option>
          <option value="expense">Dépenses</option>
          <option value="income">Revenus</option>
          <option value="transfer">Virements</option>
        </select>

        <input
          type="text"
          placeholder="Rechercher..."
          value={filters.search}
          onChange={(e) => {
            onFiltersChange({ ...filters, search: e.target.value });
            onOffsetChange(0);
          }}
          className="text-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 flex-1 min-w-40"
        />
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <p className="text-slate-500 text-sm">
            {hasFilters
              ? "Aucune transaction pour ces filtres."
              : "Aucune transaction. Crée ta première transaction."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-4 py-3 font-medium">
                  Date
                </th>
                <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-4 py-3 font-medium">
                  Description
                </th>
                <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-4 py-3 font-medium">
                  Catégorie
                </th>
                <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-4 py-3 font-medium">
                  Compte
                </th>
                <th className="text-right text-xs uppercase tracking-wider text-slate-500 px-4 py-3 font-medium">
                  Montant
                </th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const account = accountById.get(tx.account_id);
                const category = tx.category_id
                  ? categoryById.get(tx.category_id)
                  : null;
                const amountColor = TYPE_COLORS[tx.type];
                const isTransfer = tx.type === "transfer";

                return (
                  <tr
                    key={tx.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-200 truncate">
                        {tx.description}
                      </p>
                      {tx.merchant && (
                        <p className="text-xs text-slate-500 truncate">
                          {tx.merchant}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {category ? (
                        <span className="text-slate-300">
                          {category.icon ? `${category.icon} ` : ""}
                          {category.name}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {account?.name ?? "—"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-sm tabular-nums ${amountColor}`}
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {formatCurrency(tx.amount, account?.currency ?? "EUR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!isTransfer && (
                          <button
                            type="button"
                            onClick={() => onEdit(tx)}
                            title="Modifier"
                            className="text-slate-500 hover:text-slate-300 hover:bg-slate-700 p-1.5 rounded transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Supprimer "${tx.description}" ?`))
                              return;
                            setDeletingId(tx.id);
                            try {
                              await onDelete(tx);
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                          disabled={deletingId === tx.id}
                          title="Supprimer"
                          className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900/30">
            <p className="text-xs text-slate-500">
              {transactions.length} sur cette page
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOffsetChange(Math.max(0, offset - pageSize))}
                disabled={offset === 0}
                className="text-slate-500 hover:text-slate-300 hover:bg-slate-800 p-1.5 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                title="Précédent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-slate-500 font-mono">
                Page {Math.floor(offset / pageSize) + 1}
              </span>
              <button
                type="button"
                onClick={() => onOffsetChange(offset + pageSize)}
                disabled={transactions.length < pageSize}
                className="text-slate-500 hover:text-slate-300 hover:bg-slate-800 p-1.5 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                title="Suivant"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
