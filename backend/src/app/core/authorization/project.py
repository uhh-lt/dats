from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.user import UserRead
from app.core.data.orm.project import ProjectORM


def can_create_project(subject: UserRead) -> bool:
    return True


def can_read_project(project: ProjectORM, subject: UserRead) -> bool:
    return subject.id == SYSTEM_USER_ID or any(
        user.id == subject.id for user in project.users
    )


def can_remove_project(project: ProjectORM, subject: UserRead) -> bool:
    return subject.id == SYSTEM_USER_ID or any(
        user.id == subject.id for user in project.users
    )


def can_associate_user_to_project(project: ProjectORM, subject: UserRead) -> bool:
    return subject.id == SYSTEM_USER_ID or any(
        user.id == subject.id for user in project.users
    )


def can_dissociate_user_from_project(project: ProjectORM, subject: UserRead) -> bool:
    return subject.id == SYSTEM_USER_ID or any(
        user.id == subject.id for user in project.users
    )
