from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from repos.db.dto_base import UpdateDTOBase


# Properties shared across all DTOs
class UserBaseDTO(BaseModel):
    email: EmailStr = Field(description="E-Mail of the User")
    first_name: str = Field(description="First name of the User")
    last_name: str = Field(description="Last name of the User")


# Properties for creation
class UserCreate(UserBaseDTO):
    password: str = Field(description="Hashed password of the User")


# Properties for updating
class UserUpdate(BaseModel, UpdateDTOBase):
    email: str | None = Field(description="E-Mail of the User", default=None)
    first_name: str | None = Field(description="First name of the User", default=None)
    last_name: str | None = Field(description="Last name of the User", default=None)
    password: str | None = Field(
        description="Hashed password of the User", default=None
    )


# Properties for reading (as in ORM)
class UserRead(UserBaseDTO):
    id: int = Field(description="ID of the User")
    # Flo: We actually never want to return the password hence we exclude it from serialization
    password: str = Field(description="Hashed password of the User", exclude=True)
    created: datetime = Field(description="Created timestamp of the User")
    updated: datetime = Field(description="Updated timestamp of the User")
    model_config = ConfigDict(from_attributes=True)


class PublicUserRead(BaseModel):
    """A user object with information that everybody may see."""

    id: int = Field(description="ID of the User")
    first_name: str = Field(description="First name of the User")
    last_name: str = Field(description="Last name of the User")
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    username: str = Field(description="E-Mail of the User")
    password: str = Field(description="Hashed password of the User")


class UserAuthorizationHeaderData(BaseModel):
    access_token: str = Field(description="Value of the JWT")
    access_token_expires: datetime
    refresh_token: str = Field(description="For obtaining a new access token")
    refresh_token_expires: datetime
    token_type: str = Field(description="Type of the Token")


class ProjectAddUser(BaseModel):
    email: EmailStr = Field(description="E-Mail of the User")
