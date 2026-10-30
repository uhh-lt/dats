from sqlalchemy.orm import Session

from core.user.user_crud import crud_user
from core.user.user_orm import UserORM
from core.user.user_service import UserService
from core.user.user_utils import get_user_key, get_virtual_annotator_name


def read_project_users_by_keys(
    db: Session,
    *,
    project_id: int,
    keys: set[str],
    create_virtual_annotators: bool,
) -> tuple[dict[str, UserORM], list[str]]:
    """
    Resolve the user keys of an import (see `get_user_key`) to the members and
    the virtual annotators of the project. Virtual annotators the project does not
    have yet are created, so annotations and memos can be imported without their
    users file.

    Args:
        project_id: The project to import into.
        keys: The user keys of the imported rows.
        create_virtual_annotators: Create missing virtual annotators. False when
            only validating; missing virtual annotators are then left out of the
            result without an error.

    Returns:
        The users by key, and an error message for every human user that is no
        member of the project.
    """
    users_by_key = {
        get_user_key(user): user
        for user in crud_user.read_annotators_by_project(db=db, project_id=project_id)
    }

    result: dict[str, UserORM] = {}
    errors: list[str] = []
    for key in sorted(keys):
        if key in users_by_key:
            result[key] = users_by_key[key]
            continue
        name = get_virtual_annotator_name(key)
        if name is None:
            errors.append(f"User '{key}' is not part of the project {project_id}")
        elif create_virtual_annotators:
            created = UserService().create_virtual_annotator(
                db=db, project_id=project_id, name=name
            )
            result[key] = crud_user.read(db=db, id=created.id)
    return result, errors
