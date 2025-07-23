from datetime import datetime

from pydantic import BaseModel, Field


class RefreshAccessTokenData(BaseModel):
    refresh_token: str = Field(description="the refresh token")


class RefreshTokenCreate(BaseModel):
    token: str = Field(description="Value of the token")
    expires_at: datetime = Field(description="Date on which the token will expire")
    user_id: int = Field(description="User the token belongs to")
