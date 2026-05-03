export type AccountType =
  | "checking"
  | "savings"
  | "life_insurance"
  | "credit_card"
  | "cash"
  | "other";

export type Account = {
  id: number;
  name: string;
  type: AccountType;
  institution: string | null;
  currency: string;
  initial_balance: number;
  color: string | null;
  is_active: boolean;
  created_at: string;
};

export type AccountCreate = Omit<Account, "id" | "created_at">;
export type AccountUpdate = Partial<AccountCreate>;

export type CategoryType = "expense" | "income" | "both";

export type Category = {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  type: CategoryType;
  is_system: boolean;
  parent_id: number | null;
  created_at: string;
};

export type CategoryCreate = Omit<Category, "id" | "is_system" | "created_at">;

export type TransactionType = "expense" | "income" | "transfer";
export type TransactionSource = "manual" | "import_lcl" | "import_other";

export type Transaction = {
  id: number;
  account_id: number;
  category_id: number | null;
  date: string;
  amount: number;
  description: string;
  merchant: string | null;
  type: TransactionType;
  transfer_group_id: string | null;
  tags: string[] | null;
  notes: string | null;
  source: TransactionSource;
  external_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TransactionCreate = {
  account_id: number;
  category_id?: number | null;
  date: string;
  amount: number;
  description: string;
  merchant?: string | null;
  type: TransactionType;
  tags?: string[] | null;
  notes?: string | null;
};

export type TransferCreate = {
  from_account_id: number;
  to_account_id: number;
  date: string;
  amount: number;
  description: string;
  notes?: string | null;
};

export type SubscriptionFrequency =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type Subscription = {
  id: number;
  name: string;
  amount: number;
  frequency: SubscriptionFrequency;
  started_at: string;
  ended_at: string | null;
  account_id: number | null;
  category_id: number | null;
  is_active: boolean;
  icon: string | null;
  color: string | null;
  notes: string | null;
  next_billing_date: string | null;
  monthly_cost: number;
  created_at: string;
  updated_at: string;
};

export type SubscriptionCreate = {
  name: string;
  amount: number;
  frequency: SubscriptionFrequency;
  started_at: string;
  ended_at?: string | null;
  account_id?: number | null;
  category_id?: number | null;
  is_active?: boolean;
  icon?: string | null;
  color?: string | null;
  notes?: string | null;
};

export type Budget = {
  id: number;
  category_id: number;
  monthly_limit: number;
  year: number | null;
  month: number | null;
  created_at: string;
  updated_at: string;
};

export type BudgetWithSpending = Budget & {
  category_name: string;
  category_icon: string | null;
  category_color: string | null;
  spent: number;
  remaining: number;
  percentage_used: number;
  is_overspent: boolean;
};

export type BudgetCreate = {
  category_id: number;
  monthly_limit: number;
  year?: number | null;
  month?: number | null;
};

export type AccountBalance = {
  account_id: number;
  account_name: string;
  account_type: AccountType;
  account_color: string | null;
  initial_balance: number;
  current_balance: number;
};

export type FinanceStats = {
  total_balance: number;
  accounts: AccountBalance[];
  current_month_income: number;
  current_month_expense: number;
  current_month_savings: number;
  current_month_savings_rate: number;
  last_12_months: Array<{
    year: number;
    month: number;
    label: string;
    income: number;
    expense: number;
    savings: number;
  }>;
  expense_by_category: Array<{
    category_id: number | null;
    category_name: string;
    category_icon: string | null;
    category_color: string | null;
    total_amount: number;
    transaction_count: number;
    percentage: number;
  }>;
  top_merchants: Array<{
    merchant: string;
    total_amount: number;
    transaction_count: number;
  }>;
  transaction_count_this_month: number;
  active_accounts_count: number;
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Compte courant",
  savings: "Épargne / Livret",
  life_insurance: "Assurance vie",
  credit_card: "Carte de crédit",
  cash: "Espèces",
  other: "Autre",
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  checking: "🏦",
  savings: "💰",
  life_insurance: "📈",
  credit_card: "💳",
  cash: "💵",
  other: "📋",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  expense: "Dépense",
  income: "Revenu",
  transfer: "Virement",
};

export const SUBSCRIPTION_FREQUENCY_LABELS: Record<
  SubscriptionFrequency,
  string
> = {
  weekly: "Hebdomadaire",
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  yearly: "Annuel",
};

export function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// --- Parsing helpers ---
// Pydantic Decimal serializes as a string in JSON; convert at the fetch boundary.

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

type RawAccount = Omit<Account, "initial_balance"> & { initial_balance: number | string };
type RawTransaction = Omit<Transaction, "amount"> & { amount: number | string };

export function parseAccount(raw: RawAccount): Account {
  return { ...raw, initial_balance: num(raw.initial_balance) };
}

export function parseTransaction(raw: RawTransaction): Transaction {
  return { ...raw, amount: num(raw.amount) };
}

type RawSubscription = Omit<Subscription, "amount" | "monthly_cost"> & {
  amount: number | string;
  monthly_cost: number | string;
};

type RawBudget = Omit<Budget, "monthly_limit"> & {
  monthly_limit: number | string;
};

type RawBudgetWithSpending = Omit<
  BudgetWithSpending,
  "monthly_limit" | "spent" | "remaining"
> & {
  monthly_limit: number | string;
  spent: number | string;
  remaining: number | string;
};

export function parseSubscription(raw: RawSubscription): Subscription {
  return {
    ...raw,
    amount: num(raw.amount),
    monthly_cost: num(raw.monthly_cost),
  };
}

export function parseBudget(raw: RawBudget): Budget {
  return { ...raw, monthly_limit: num(raw.monthly_limit) };
}

export function parseBudgetWithSpending(
  raw: RawBudgetWithSpending,
): BudgetWithSpending {
  return {
    ...raw,
    monthly_limit: num(raw.monthly_limit),
    spent: num(raw.spent),
    remaining: num(raw.remaining),
  };
}

type RawStats = {
  total_balance: number | string;
  accounts: Array<
    Omit<AccountBalance, "initial_balance" | "current_balance"> & {
      initial_balance: number | string;
      current_balance: number | string;
    }
  >;
  current_month_income: number | string;
  current_month_expense: number | string;
  current_month_savings: number | string;
  current_month_savings_rate: number;
  last_12_months: Array<{
    year: number;
    month: number;
    label: string;
    income: number | string;
    expense: number | string;
    savings: number | string;
  }>;
  expense_by_category: Array<{
    category_id: number | null;
    category_name: string;
    category_icon: string | null;
    category_color: string | null;
    total_amount: number | string;
    transaction_count: number;
    percentage: number;
  }>;
  top_merchants: Array<{
    merchant: string;
    total_amount: number | string;
    transaction_count: number;
  }>;
  transaction_count_this_month: number;
  active_accounts_count: number;
};

export function parseStats(raw: RawStats): FinanceStats {
  return {
    total_balance: num(raw.total_balance),
    accounts: raw.accounts.map((a) => ({
      ...a,
      initial_balance: num(a.initial_balance),
      current_balance: num(a.current_balance),
    })),
    current_month_income: num(raw.current_month_income),
    current_month_expense: num(raw.current_month_expense),
    current_month_savings: num(raw.current_month_savings),
    current_month_savings_rate: raw.current_month_savings_rate,
    last_12_months: raw.last_12_months.map((m) => ({
      ...m,
      income: num(m.income),
      expense: num(m.expense),
      savings: num(m.savings),
    })),
    expense_by_category: raw.expense_by_category.map((c) => ({
      ...c,
      total_amount: num(c.total_amount),
    })),
    top_merchants: raw.top_merchants.map((m) => ({
      ...m,
      total_amount: num(m.total_amount),
    })),
    transaction_count_this_month: raw.transaction_count_this_month,
    active_accounts_count: raw.active_accounts_count,
  };
}
