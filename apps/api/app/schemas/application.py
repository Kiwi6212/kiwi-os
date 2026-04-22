from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.application import ApplicationStatus, ContractType


class ApplicationBase(BaseModel):
    company: str = Field(..., min_length=1, max_length=200)
    position: str = Field(..., min_length=1, max_length=200)
    url: str | None = Field(None, max_length=500)
    location: str | None = Field(None, max_length=200)
    contract_type: ContractType | None = None
    salary_min: int | None = Field(None, ge=0)
    salary_max: int | None = Field(None, ge=0)
    status: ApplicationStatus = ApplicationStatus.NEW
    cv_sent: bool = False
    follow_up_done: bool = False
    is_favorite: bool = False
    date_applied: date | None = None
    follow_up_date: date | None = None
    last_contact: date | None = None
    notes: str | None = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    company: str | None = Field(None, min_length=1, max_length=200)
    position: str | None = Field(None, min_length=1, max_length=200)
    url: str | None = Field(None, max_length=500)
    location: str | None = Field(None, max_length=200)
    contract_type: ContractType | None = None
    salary_min: int | None = Field(None, ge=0)
    salary_max: int | None = Field(None, ge=0)
    status: ApplicationStatus | None = None
    cv_sent: bool | None = None
    follow_up_done: bool | None = None
    is_favorite: bool | None = None
    date_applied: date | None = None
    follow_up_date: date | None = None
    last_contact: date | None = None
    notes: str | None = None


class ApplicationOut(ApplicationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationStats(BaseModel):
    total: int
    by_status: dict[str, int]
    active_count: int
    response_rate: float
    interview_rate: float
    favorites_count: int
