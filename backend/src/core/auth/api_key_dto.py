from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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
