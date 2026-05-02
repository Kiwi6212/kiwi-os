import datetime as dt
from decimal import Decimal

from dateutil.relativedelta import relativedelta

from app.models.finance.subscription import Subscription, SubscriptionFrequency


def calculate_next_billing_date(
    sub: Subscription, today: dt.date | None = None
) -> dt.date | None:
    """Compute the next billing date by walking started_at forward by frequency.

    Returns None if the subscription is inactive or already ended.
    """
    if today is None:
        today = dt.date.today()

    if sub.ended_at and sub.ended_at <= today:
        return None
    if not sub.is_active:
        return None

    next_date = sub.started_at
    while next_date <= today:
        if sub.frequency == SubscriptionFrequency.WEEKLY:
            next_date += dt.timedelta(weeks=1)
        elif sub.frequency == SubscriptionFrequency.MONTHLY:
            next_date += relativedelta(months=1)
        elif sub.frequency == SubscriptionFrequency.QUARTERLY:
            next_date += relativedelta(months=3)
        elif sub.frequency == SubscriptionFrequency.YEARLY:
            next_date += relativedelta(years=1)
        else:
            break
    return next_date


def calculate_monthly_cost(sub: Subscription) -> Decimal:
    """Normalize the recurring cost to a monthly equivalent."""
    amount = Decimal(str(sub.amount))
    if sub.frequency == SubscriptionFrequency.WEEKLY:
        return (amount * Decimal("52")) / Decimal("12")
    if sub.frequency == SubscriptionFrequency.MONTHLY:
        return amount
    if sub.frequency == SubscriptionFrequency.QUARTERLY:
        return amount / Decimal("3")
    if sub.frequency == SubscriptionFrequency.YEARLY:
        return amount / Decimal("12")
    return amount
