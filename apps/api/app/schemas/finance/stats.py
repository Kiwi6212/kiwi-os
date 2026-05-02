from decimal import Decimal

from pydantic import BaseModel

from app.models.finance.account import AccountType


class AccountBalance(BaseModel):
    account_id: int
    account_name: str
    account_type: AccountType
    account_color: str | None
    initial_balance: Decimal
    current_balance: Decimal


class MonthlyEvolution(BaseModel):
    year: int
    month: int
    label: str
    income: Decimal
    expense: Decimal
    savings: Decimal


class CategoryBreakdown(BaseModel):
    category_id: int | None
    category_name: str
    category_icon: str | None
    category_color: str | None
    total_amount: Decimal
    transaction_count: int
    percentage: float


class TopMerchant(BaseModel):
    merchant: str
    total_amount: Decimal
    transaction_count: int


class FinanceStats(BaseModel):
    total_balance: Decimal
    accounts: list[AccountBalance]

    current_month_income: Decimal
    current_month_expense: Decimal
    current_month_savings: Decimal
    current_month_savings_rate: float

    last_12_months: list[MonthlyEvolution]

    expense_by_category: list[CategoryBreakdown]
    top_merchants: list[TopMerchant]

    transaction_count_this_month: int
    active_accounts_count: int


class PeriodComparison(BaseModel):
    period: str
    current_label: str
    previous_label: str

    current_income: Decimal
    previous_income: Decimal
    income_delta_pct: float | None

    current_expense: Decimal
    previous_expense: Decimal
    expense_delta_pct: float | None

    current_savings: Decimal
    previous_savings: Decimal
    savings_delta_pct: float | None
