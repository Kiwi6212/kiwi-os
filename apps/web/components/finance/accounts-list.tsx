"use client";

import { Edit, Power } from "lucide-react";
import {
  type Account,
  type AccountBalance,
  ACCOUNT_TYPE_ICONS,
  ACCOUNT_TYPE_LABELS,
  formatCurrency,
} from "@/lib/types/finance";

interface Props {
  accounts: Account[];
  balances: AccountBalance[];
  onEdit: (account: Account) => void;
  onToggle: (account: Account) => void;
}

export function AccountsList({
  accounts,
  balances,
  onEdit,
  onToggle,
}: Props) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-12 text-center">
        <p className="text-slate-500">Aucun compte pour le moment.</p>
        <p className="text-sm text-slate-500 mt-1">
          Crée ton premier compte pour commencer.
        </p>
      </div>
    );
  }

  const balanceById = new Map(balances.map((b) => [b.account_id, b]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {accounts.map((account) => {
        const bal = balanceById.get(account.id);
        const currentBalance = bal?.current_balance ?? account.initial_balance;
        const balanceColor =
          currentBalance >= 0 ? "text-emerald-600" : "text-rose-600";
        const inactive = !account.is_active;

        return (
          <div
            key={account.id}
            className={`relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:-translate-y-0.5 hover:border-slate-300 ${
              inactive ? "opacity-50" : ""
            }`}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ backgroundColor: account.color ?? "#64748b" }}
            />
            <div className="p-5 pl-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-lg">
                      {ACCOUNT_TYPE_ICONS[account.type]}
                    </span>
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {account.name}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {ACCOUNT_TYPE_LABELS[account.type]}
                    {account.institution ? ` · ${account.institution}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEdit(account)}
                    title="Modifier"
                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggle(account)}
                    title={inactive ? "Activer" : "Désactiver"}
                    className={`p-1.5 rounded transition-colors ${
                      inactive
                        ? "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                        : "text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                    }`}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p
                className={`font-mono text-2xl font-semibold tabular-nums ${balanceColor}`}
              >
                {formatCurrency(currentBalance, account.currency)}
              </p>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Initial : {formatCurrency(account.initial_balance, account.currency)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
