from collections.abc import Iterable

from sqlalchemy.orm import Session

from core.user.user_crud import crud_user
from core.user.user_dto import UserRead
from core.user.user_orm import UserORM

# Ids differ between DATS instances, so exports and saved filters reference users
# by a key: the email, or this prefix + the name of a virtual user (names are
# unique per project). Emails never start with it.
VIRTUAL_USER_KEY_PREFIX = "virtual:"


def get_user_key(user: UserORM | UserRead) -> str:
    """The key of a user that identifies it in exports and saved filters."""
    if user.email is None:  # virtual users have no email
        return f"{VIRTUAL_USER_KEY_PREFIX}{user.first_name}"
    return user.email


def read_users_by_keys(
    db: Session,
    *,
    project_id: int,
    keys: Iterable[str],
    create_virtual_users: bool = False,
) -> dict[str, UserORM]:
    """
    Read the users of a project (members and virtual users) by their keys.

    Args:
        project_id: The project.
        keys: The user keys (see `get_user_key`).
        create_virtual_users: Create the virtual users the project does not have
            yet, e.g. when importing annotations without their users file.

    Returns:
        The users by key; keys of no user of the project are missing.
    """
    project_users = {
        get_user_key(user): user
        for user in crud_user.read_by_project(db=db, project_id=project_id)
    }
    result: dict[str, UserORM] = {}
    for key in sorted(set(keys)):
        if key in project_users:
            result[key] = project_users[key]
        elif create_virtual_users and key.startswith(VIRTUAL_USER_KEY_PREFIX):
            result[key] = crud_user.create_virtual_user(
                db=db,
                project_id=project_id,
                name=key.removeprefix(VIRTUAL_USER_KEY_PREFIX),
            )
    return result
