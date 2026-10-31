from datetime import datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from repos.db.dto_base import UpdateDTOBase


# Properties shared across all DTOs
class UserBaseDTO(BaseModel):
    first_name: str = Field(description="First name of the User")
    last_name: str = Field(description="Last name of the User")


# Properties for creation
class UserCreate(UserBaseDTO):
    email: EmailStr = Field(description="E-Mail of the User")
    password: str = Field(description="Hashed password of the User")


# Properties for updating
class UserUpdate(BaseModel, UpdateDTOBase):
    # NOT NULL columns: omit to keep the value, an explicit null is rejected
    non_nullable_fields: ClassVar[frozenset[str]] = frozenset(
        {"email", "first_name", "last_name", "password"}
    )

    email: str | None = Field(description="E-Mail of the User", default=None)
    first_name: str | None = Field(description="First name of the User", default=None)
    last_name: str | None = Field(description="Last name of the User", default=None)
    password: str | None = Field(
        description="Hashed password of the User", default=None
    )


# Properties for reading (as in ORM)
class UserRead(UserBaseDTO):
    id: int = Field(description="ID of the User")
    is_virtual: bool = Field(
        description="Whether the User is a virtual user (no login, one project)"
    )
    email: str | None = Field(description="E-Mail of the User (None if virtual)")
    project_id: int | None = Field(
        description="Project of a virtual user (None for other users)"
    )
    # Flo: We actually never want to return the password hence we exclude it from serialization
    password: str | None = Field(
        description="Hashed password of the User", exclude=True
    )
    created: datetime = Field(description="Created timestamp of the User")
    updated: datetime = Field(description="Updated timestamp of the User")
    model_config = ConfigDict(from_attributes=True)


class PublicUserRead(BaseModel):
    """A user object with information that everybody may see."""

    id: int = Field(description="ID of the User")
    is_virtual: bool = Field(
        description="Whether the User is a virtual user (no login, one project)"
    )
    first_name: str = Field(description="First name of the User")
    last_name: str = Field(description="Last name of the User")
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    username: str = Field(description="E-Mail of the User")
    password: str = Field(description="Hashed password of the User")


class UserAuthorizationHeaderData(BaseModel):
    access_token: str = Field(description="Value of the JWT")
    access_token_expires: datetime = Field(
        description="Expiration timestamp of the access token"
    )
    refresh_token: str = Field(description="For obtaining a new access token")
    refresh_token_expires: datetime = Field(
        description="Expiration timestamp of the refresh token"
    )
    token_type: str = Field(description="Type of the Token")


class ProjectAddUser(BaseModel):
    email: EmailStr = Field(description="E-Mail of the User")


class VirtualUserCreate(BaseModel):
    """A virtual user: a user without login that belongs to one project and owns
    annotations, e.g. of an LLM Assistant run."""

    name: str = Field(
        description="Name of the virtual user, unique per project", min_length=1
    )


class VirtualUserUpdate(BaseModel, UpdateDTOBase):
    # NOT NULL column: omit to keep the name, an explicit null is rejected
    non_nullable_fields: ClassVar[frozenset[str]] = frozenset({"name"})

    name: str | None = Field(
        description="Name of the virtual user, unique per project",
        default=None,
        min_length=1,
    )
