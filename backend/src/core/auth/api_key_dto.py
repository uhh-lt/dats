from datetime import datetime, timezone
from enum import Enum

from dateutil.relativedelta import relativedelta
from pydantic import BaseModel, ConfigDict, Field


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
    name: str = Field(description="Name of the ApiKey")
    prefix: str = Field(description="Public prefix of the ApiKey to identify it")
    hashed_key: str = Field(description="Hash of the full ApiKey")
    expires_at: datetime | None = Field(
        description="Expiration timestamp of the ApiKey (None = never expires)"
    )
    created_at: datetime = Field(description="Created timestamp of the ApiKey")
    user_id: int = Field(description="User the ApiKey belongs to")


class ApiKeyRead(BaseModel):
    id: int = Field(description="ID of the ApiKey")
    name: str = Field(description="Name of the ApiKey")
    prefix: str = Field(description="Public prefix of the ApiKey to identify it")
    expires_at: datetime | None = Field(
        description="Expiration timestamp of the ApiKey (None = never expires)"
    )
    created_at: datetime = Field(description="Created timestamp of the ApiKey")
    model_config = ConfigDict(from_attributes=True)


class ApiKeyCreatedResponse(ApiKeyRead):
    api_key: str = Field(
        description="The full ApiKey. It is only returned once, on creation."
    )
