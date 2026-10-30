from sqlalchemy.orm import Session

from core.user.user_crud import crud_user
from core.user.user_dto import PublicUserRead, UserRead
from core.user.user_enum import UserKind
from core.user.user_orm import UserORM

# Ids differ between DATS instances, so exports and saved filters reference users
# by a key: the email of a human user, this prefix + the name of a virtual
# annotator (names are unique per project). Emails never start with it.
VIRTUAL_ANNOTATOR_KEY_PREFIX = "virtual:"


def get_user_key(user: UserORM | UserRead | PublicUserRead) -> str:
    """The key of a user that identifies it in exports and saved filters."""
    if user.kind == UserKind.VIRTUAL:
        return f"{VIRTUAL_ANNOTATOR_KEY_PREFIX}{user.first_name}"
    assert isinstance(user, UserORM | UserRead) and user.email is not None
    return user.email


def get_virtual_annotator_name(key: str) -> str | None:
    """The name of the virtual annotator a key refers to, None for a human key."""
    if not key.startswith(VIRTUAL_ANNOTATOR_KEY_PREFIX):
        return None
    return key.removeprefix(VIRTUAL_ANNOTATOR_KEY_PREFIX)


def read_users_by_keys(
    db: Session, *, project_id: int, keys: list[str]
) -> dict[str, UserORM]:
    """
    Read the users with the given keys: human users by email, virtual annotators
    by name within the project.

    Args:
        project_id: The project whose virtual annotators the keys refer to.
        keys: The user keys (see `get_user_key`).

    Returns:
        The existing users by key; keys without a user are missing.
    """
    names = [
        name for key in keys if (name := get_virtual_annotator_name(key)) is not None
    ]
    emails = [key for key in keys if get_virtual_annotator_name(key) is None]
    users = crud_user.read_by_emails(db=db, emails=emails)
    users += crud_user.read_virtual_annotators_by_names(
        db=db, project_id=project_id, names=names
    )
    return {get_user_key(user): user for user in users}
