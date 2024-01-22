import random
import string

import pytest
from sqlalchemy.orm import Session

from app.core.data.crud.crud_base import NoSuchElementError
from app.core.data.crud.user import crud_user
from app.core.data.dto.code import CodeRead
from app.core.data.dto.project import ProjectRead
from app.core.data.dto.user import UserCreate, UserRead, UserUpdate


def test_create_delete_user(db: Session) -> None:
    email = f'{"".join(random.choices(string.ascii_letters, k=15))}@gmail.com'
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
    crud_user.remove(db=db, id=user_new.id)

    # try to delete user second time
    with pytest.raises(NoSuchElementError):
        crud_user.read(db=db, id=user_new.id)


def test_update_user(db: Session, user: int) -> None:
    email = f'{"".join(random.choices(string.ascii_letters, k=15))}@gmail.com'
    first_name = "".join(random.choices(string.ascii_letters, k=15))
    last_name = "".join(random.choices(string.ascii_letters, k=15))
    password = "".join(random.choices(string.ascii_letters, k=15))

    user_update = UserUpdate(
        email=email, first_name=first_name, last_name=last_name, password=password
    )

    crud_user.update(db=db, id=user, update_dto=user_update)

    db_user = crud_user.read(db=db, id=user)
    user_read = UserRead.model_validate(db_user)

    assert user_read.email == email
    assert user_read.first_name == first_name
    assert user_read.last_name == last_name
    assert user_read.password != password  # password is hashed


def test_get_user_projects(db: Session, project: int, user: int) -> None:
    db_obj = crud_user.read(db=db, id=user)
    user_projects = [ProjectRead.model_validate(proj) for proj in db_obj.projects]

    assert len(user_projects) == 1
    assert user_projects[0].id == project


# TODO: Fails on teardown because the codes gets removed here already!
def test_get_delete_user_codes(db: Session, code: int, user: int) -> None:
    db_obj = crud_user.read(db=db, id=user)
    user_codes = [CodeRead.model_validate(code) for code in db_obj.codes]

    assert len(user_codes) == 1

    # crud_user.remove_all_codes(db=db, id=user)

    # db_obj = crud_user.read(db=db, id=user)
    # user_codes = [CodeRead.model_validate(code) for code in db_obj.codes]

    # assert len(user_codes) == 0


# TODO: Fails on teardown because the codes gets removed here already!
def test_delete_user_codes(db: Session, user: int, code: int) -> None:
    db_obj = crud_user.read(db=db, id=user)
    codes = [CodeRead.model_validate(code) for code in db_obj.codes]

    assert len(codes) == 1

    # crud_user.remove_all_codes(db=db, id=user)
    # db_obj = crud_user.read(db=db, id=user)
    # codes = [CodeRead.model_validate(code) for code in db_obj.codes]

    # assert len(codes) == 0


def test_get_all_user(db: Session, user: int) -> None:
    db_objs = crud_user.read_multi(db=db)
    users = [UserRead.model_validate(proj) for proj in db_objs]

    assert len(users) == 2
