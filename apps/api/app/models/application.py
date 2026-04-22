from datetime import date, datetime
from enum import Enum

from sqlalchemy import Boolean, Date, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class ApplicationStatus(str, Enum):
    NEW = "New"
    APPLIED = "Applied"
    FOLLOWED_UP = "Followed up"
    INTERVIEW = "Interview"
    ACCEPTED = "Accepted"
    REJECTED = "Rejected"
    NO_RESPONSE = "No response"
    DISMISSED = "Dismissed"


class ContractType(str, Enum):
    ALTERNANCE = "Alternance"
    CDI = "CDI"
    CDD = "CDD"
    STAGE = "Stage"
    FREELANCE = "Freelance"
    OTHER = "Other"


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    company: Mapped[str] = mapped_column(String(200), nullable=False)
    position: Mapped[str] = mapped_column(String(200), nullable=False)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)

    contract_type: Mapped[ContractType | None] = mapped_column(
        SAEnum(
            ContractType,
            name="contract_type_enum",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=True,
    )
    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)

    status: Mapped[ApplicationStatus] = mapped_column(
        SAEnum(
            ApplicationStatus,
            name="application_status_enum",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=ApplicationStatus.NEW,
    )
    cv_sent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    follow_up_done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_favorite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    date_applied: Mapped[date | None] = mapped_column(Date, nullable=True)
    follow_up_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_contact: Mapped[date | None] = mapped_column(Date, nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
