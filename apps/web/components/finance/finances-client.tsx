"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  type LucideIcon,
  Plus,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import {
  type Account,
  type AccountCreate,
  type Category,
  type FinanceStats,
  type Transaction,
  type TransactionCreate,
  type TransferCreate,
  formatCurrency,
  parseAccount,
  parseStats,
  parseTransaction,
} from "@/lib/types/finance";
import { AccountFormModal } from "./account-form-modal";
import { AccountsList } from "./accounts-list";
import { TransactionFormModal } from "./transaction-form-modal";
import { TransferModal } from "./transfer-modal";
import {
  type TransactionFilters,
  TransactionsTable,
} from "./transactions-table";

const API_BASE = "http://localhost:8000";
const PAGE_SIZE = 20;

function initialFilters(): TransactionFilters {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    account_id: null,
    category_id: null,
    type: null,
    search: "",
  };
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function FinancesClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>(() =>
    initialFilters(),
  );
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [transferModalOpen, setTransferModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const dateFrom = `${filters.year}-${String(filters.month).padStart(2, "0")}-01`;
        const lastDay = lastDayOfMonth(filters.year, filters.month);
        const dateTo = `${filters.year}-${String(filters.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        const txParams = new URLSearchParams({
          date_from: dateFrom,
          date_to: dateTo,
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (filters.account_id !== null)
          txParams.set("account_id", String(filters.account_id));
        if (filters.category_id !== null)
          txParams.set("category_id", String(filters.category_id));
        if (filters.type !== null) txParams.set("type", filters.type);
        if (filters.search.trim()) txParams.set("search", filters.search.trim());

        const [accRes, catRes, statsRes, txRes] = await Promise.all([
          fetch(`${API_BASE}/api/finances/accounts`),
          fetch(`${API_BASE}/api/finances/categories`),
          fetch(`${API_BASE}/api/finances/stats`),
          fetch(`${API_BASE}/api/finances/transactions?${txParams}`),
        ]);

        if (cancelled) return;
        if (!accRes.ok || !catRes.ok || !statsRes.ok || !txRes.ok) {
          throw new Error("Erreur de chargement");
        }

        const rawAccounts = (await accRes.json()) as Parameters<
          typeof parseAccount
        >[0][];
        const rawCategories = (await catRes.json()) as Category[];
        const rawStats = (await statsRes.json()) as Parameters<
          typeof parseStats
        >[0];
        const rawTxs = (await txRes.json()) as Parameters<
          typeof parseTransaction
        >[0][];

        if (cancelled) return;

        setAccounts(rawAccounts.map(parseAccount));
        setCategories(rawCategories);
        setStats(parseStats(rawStats));
        setTransactions(rawTxs.map(parseTransaction));
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters, offset, refreshKey]);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  const handleCreateAccount = async (data: AccountCreate) => {
    const res = await fetch(`${API_BASE}/api/finances/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    triggerRefresh();
  };

  const handleEditAccount = async (data: AccountCreate) => {
    if (!editingAccount) return;
    const res = await fetch(
      `${API_BASE}/api/finances/accounts/${editingAccount.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    triggerRefresh();
  };

  const handleToggleAccount = async (account: Account) => {
    const res = await fetch(`${API_BASE}/api/finances/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !account.is_active }),
    });
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    triggerRefresh();
  };

  const handleCreateTx = async (data: TransactionCreate) => {
    const res = await fetch(`${API_BASE}/api/finances/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    triggerRefresh();
  };

  const handleEditTx = async (data: TransactionCreate) => {
    if (!editingTx) return;
    const res = await fetch(
      `${API_BASE}/api/finances/transactions/${editingTx.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    triggerRefresh();
  };

  const handleDeleteTx = async (tx: Transaction) => {
    const res = await fetch(`${API_BASE}/api/finances/transactions/${tx.id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 204) throw new Error(`Erreur ${res.status}`);
    triggerRefresh();
  };

  const handleTransfer = async (data: TransferCreate) => {
    const res = await fetch(
      `${API_BASE}/api/finances/transactions/transfer`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Erreur ${res.status} : ${detail}`);
    }
    triggerRefresh();
  };

  const openEditAccount = (a: Account) => {
    setEditingAccount(a);
    setAccountModalOpen(true);
  };

  const closeAccountModal = () => {
    setAccountModalOpen(false);
    setEditingAccount(null);
  };

  const openEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setTxModalOpen(true);
  };

  const closeTxModal = () => {
    setTxModalOpen(false);
    setEditingTx(null);
  };

  const noActiveAccounts = accounts.filter((a) => a.is_active).length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Finances</h1>
          <p className="text-slate-400 mt-1">
            Vue d&apos;ensemble de tes comptes, transactions et virements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingAccount(null);
              setAccountModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Compte
          </button>
          <button
            type="button"
            onClick={() => setTransferModalOpen(true)}
            disabled={accounts.length < 2}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              accounts.length < 2
                ? "Crée au moins 2 comptes pour faire un virement"
                : "Virement entre comptes"
            }
          >
            <ArrowLeftRight className="h-4 w-4" />
            Virement
          </button>
          <button
            type="button"
            disabled
            title="Bientôt disponible — en attente du retour des exports CSV LCL"
            className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 text-slate-500 text-sm font-medium rounded-lg cursor-not-allowed"
          >
            <Upload className="h-4 w-4" />
            Importer CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setTxModalOpen(true);
            }}
            disabled={noActiveAccounts}
            className="flex items-center gap-2 px-4 py-2 bg-kiwi-500 hover:bg-kiwi-400 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              noActiveAccounts
                ? "Crée d'abord un compte"
                : "Nouvelle transaction"
            }
          >
            <Plus className="h-4 w-4" />
            Nouvelle transaction
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Solde total"
            value={formatCurrency(stats.total_balance)}
            icon={Wallet}
            color={
              stats.total_balance >= 0 ? "text-emerald-400" : "text-rose-400"
            }
          />
          <KpiCard
            label="Dépenses ce mois"
            value={formatCurrency(stats.current_month_expense)}
            icon={TrendingDown}
            color="text-rose-400"
          />
          <KpiCard
            label="Revenus ce mois"
            value={formatCurrency(stats.current_month_income)}
            icon={TrendingUp}
            color="text-emerald-400"
          />
          <KpiCard
            label={`Économies (${stats.current_month_savings_rate.toFixed(0)}%)`}
            value={formatCurrency(stats.current_month_savings)}
            icon={Wallet}
            color={
              stats.current_month_savings >= 0
                ? "text-kiwi-400"
                : "text-rose-400"
            }
          />
        </div>
      )}

      {error && (
        <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
          {error}
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wide mb-4">
          Comptes
        </h2>
        {loading ? (
          <div className="text-slate-500 text-sm py-6 text-center">
            Chargement...
          </div>
        ) : (
          <AccountsList
            accounts={accounts}
            balances={stats?.accounts ?? []}
            onEdit={openEditAccount}
            onToggle={handleToggleAccount}
          />
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wide mb-4">
          Transactions
        </h2>
        <TransactionsTable
          transactions={transactions}
          accounts={accounts}
          categories={categories}
          filters={filters}
          onFiltersChange={setFilters}
          offset={offset}
          pageSize={PAGE_SIZE}
          onOffsetChange={setOffset}
          onEdit={openEditTx}
          onDelete={handleDeleteTx}
        />
      </section>

      {accountModalOpen && (
        <AccountFormModal
          key={editingAccount?.id ?? "new-account"}
          onClose={closeAccountModal}
          onSubmit={editingAccount ? handleEditAccount : handleCreateAccount}
          initialAccount={editingAccount ?? undefined}
        />
      )}

      {txModalOpen && (
        <TransactionFormModal
          key={editingTx?.id ?? "new-tx"}
          onClose={closeTxModal}
          onSubmit={editingTx ? handleEditTx : handleCreateTx}
          accounts={accounts.filter((a) => a.is_active)}
          categories={categories}
          initialTransaction={editingTx ?? undefined}
        />
      )}

      {transferModalOpen && (
        <TransferModal
          key="transfer"
          onClose={() => setTransferModalOpen(false)}
          onSubmit={handleTransfer}
          accounts={accounts.filter((a) => a.is_active)}
        />
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} strokeWidth={1.5} />
        <p className="text-xs uppercase tracking-wider text-slate-500">
          {label}
        </p>
      </div>
      <p className={`font-mono text-2xl font-semibold tabular-nums ${color}`}>
        {value}
      </p>
    </div>
  );
}
