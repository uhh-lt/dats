from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from .dto_base import UpdateDTOBase


# Properties shared across all DTOs
class UserBaseDTO(BaseModel):
    email: EmailStr = Field(description="E-Mail of the User")
    first_name: str = Field(description="First name of the User")
    last_name: str = Field(description="Last name of the User")


# Properties for creation
class UserCreate(UserBaseDTO):
    password: str = Field(description="Hashed password of the User")


# Properties for updating
class UserUpdate(UserBaseDTO, UpdateDTOBase):
    email: Optional[str] = Field(description="E-Mail of the User", default=None)
    first_name: Optional[str] = Field(
        description="First name of the User", default=None
    )
    last_name: Optional[str] = Field(description="Last name of the User", default=None)
    password: Optional[str] = Field(
        description="Hashed password of the User", default=None
    )


# Properties for reading (as in ORM)
class UserRead(UserBaseDTO):
    id: int = Field(description="ID of the User")
    password: str = Field(description="Hashed password of the User")
    created: datetime = Field(description="Created timestamp of the User")
    updated: datetime = Field(description="Updated timestamp of the User")

    class Config:
        orm_mode = True
        # Flo: We actually never want to return the password hence we exclude it from serialization
        fields = {"password": {"exclude": True}}


class UserLogin(BaseModel):
    username: str = Field(description="E-Mail of the User")
    password: str = Field(description="Hashed password of the User")


class UserAuthorizationHeaderData(BaseModel):
    access_token: str = Field(description="Value of the JWT")
    token_type: str = Field(description="Type of the Token")
