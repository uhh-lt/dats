import random
import string

import pytest
from sqlalchemy.orm import Session

from core.project.project_dto import ProjectRead
from core.project.project_orm import ProjectORM
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate, UserRead, UserUpdate
from core.user.user_orm import UserORM
from repos.db.crud_base import NoSuchElementError


def test_create_delete_user(db: Session) -> None:
    email = f"{''.join(random.choices(string.ascii_letters, k=15))}@gmail.com"
    first_name = "".join(random.choices(string.ascii_letters, k=15))
    last_name = "".join(random.choices(string.ascii_letters, k=15))
    password = "".join(random.choices(string.ascii_letters, k=15))

    user = UserCreate(
        email=email, first_name=first_name, last_name=last_name, password=password
    )

    # create user
    db_user = crud_user.create(db=db, create_dto=user)
    user_new = UserRead.model_validate(db_user)

    # read user
    db_user = crud_user.read(db=db, id=user_new.id)
    user = UserRead.model_validate(db_user)

    assert user.email == email
    assert user.first_name == first_name
    assert user.last_name == last_name
    assert user.password != password  # password is hashed

    # delete user
    crud_user.delete(db=db, id=user_new.id)

    # try to delete user second time
    with pytest.raises(NoSuchElementError):
        crud_user.read(db=db, id=user_new.id)


def test_update_user(db: Session, user: UserORM) -> None:
    email = f"{''.join(random.choices(string.ascii_letters, k=15))}@gmail.com"
    first_name = "".join(random.choices(string.ascii_letters, k=15))
    last_name = "".join(random.choices(string.ascii_letters, k=15))
    password = "".join(random.choices(string.ascii_letters, k=15))

    user_update = UserUpdate(
        email=email, first_name=first_name, last_name=last_name, password=password
    )

    crud_user.update(db=db, id=user.id, update_dto=user_update)

    user_read = UserRead.model_validate(user)

    assert user_read.email == email
    assert user_read.first_name == first_name
    assert user_read.last_name == last_name
    assert user_read.password != password  # password is hashed


def test_get_user_projects(db: Session, project: ProjectORM, user: UserORM) -> None:
    db_obj = crud_user.read(db=db, id=user.id)
    user_projects = [ProjectRead.model_validate(proj) for proj in db_obj.projects]

    assert len(user_projects) == 1
    assert user_projects[0].id == project.id


def test_get_all_user(db: Session, user: UserORM) -> None:
    db_objs = crud_user.read_multi(db=db)
    users = [UserRead.model_validate(proj) for proj in db_objs]

    assert len(users) >= 1
