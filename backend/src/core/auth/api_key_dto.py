from datetime import datetime, timezone
from enum import Enum

from dateutil.relativedelta import relativedelta
from pydantic import BaseModel


class ExpiryDuration(str, Enum):
    ONE_MONTH = "1_month"
    THREE_MONTHS = "3_months"
    SIX_MONTHS = "6_months"
    ONE_YEAR = "1_year"
    THREE_YEARS = "3_years"
    NEVER = "never"

    def to_datetime(self) -> datetime | None:
        if self == self.NEVER:
            return None

        deltas = {
            self.ONE_MONTH: relativedelta(months=1),
            self.THREE_MONTHS: relativedelta(months=3),
            self.SIX_MONTHS: relativedelta(months=6),
            self.ONE_YEAR: relativedelta(years=1),
            self.THREE_YEARS: relativedelta(years=3),
        }
        return datetime.now(timezone.utc) + deltas[self]


class ApiKeyCreate(BaseModel):
    name: str
    prefix: str
    hashed_key: str
    expires_at: datetime | None
    created_at: datetime
    user_id: int


class ApiKeyRead(BaseModel):
    id: int
    name: str
    prefix: str
    expires_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class ApiKeyCreatedResponse(ApiKeyRead):
    api_key: str  # full key — shown only once on creation
