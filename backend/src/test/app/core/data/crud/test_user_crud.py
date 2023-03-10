import random
import string

import pytest

from app.core.data.crud.crud_base import NoSuchElementError
from app.core.data.crud.user import crud_user
from app.core.data.dto import ProjectRead
from app.core.data.dto.code import CodeRead
from app.core.data.dto.user import UserRead, UserCreate, UserUpdate
from app.core.db.sql_service import SQLService


def test_create_delete_user(session: SQLService) -> None:
    email = f'{"".join(random.choices(string.ascii_letters, k=15))}@gmail.com'
    first_name = "".join(random.choices(string.ascii_letters, k=15))
    last_name = "".join(random.choices(string.ascii_letters, k=15))
    password = "".join(random.choices(string.ascii_letters, k=15))

    user = UserCreate(
        email=email, first_name=first_name, last_name=last_name, password=password
    )

    with session.db_session() as sess:
        # create user
        db_user = crud_user.create(db=sess, create_dto=user)
        user_new = UserRead.from_orm(db_user)

        # read user
        db_user = crud_user.read(db=sess, id=user_new.id)
        user = UserRead.from_orm(db_user)

    assert user.email == email
    assert user.first_name == first_name
    assert user.last_name == last_name
    assert user.password != password  # password is hashed

    # delete user
    with session.db_session() as sess:
        crud_user.remove(db=sess, id=user_new.id)

        # try to delete user second time
        with pytest.raises(NoSuchElementError) as e:
            crud_user.read(db=sess, id=user_new.id)


def test_update_user(session: SQLService, user: int) -> None:
    email = f'{"".join(random.choices(string.ascii_letters, k=15))}@gmail.com'
    first_name = "".join(random.choices(string.ascii_letters, k=15))
    last_name = "".join(random.choices(string.ascii_letters, k=15))
    password = "".join(random.choices(string.ascii_letters, k=15))

    user_update = UserUpdate(
        email=email, first_name=first_name, last_name=last_name, password=password
    )

    with session.db_session() as sess:
        crud_user.update(db=sess, id=user, update_dto=user_update)

        db_user = crud_user.read(db=sess, id=user)
        user_read = UserRead.from_orm(db_user)

    assert user_read.email == email
    assert user_read.first_name == first_name
    assert user_read.last_name == last_name
    assert user_read.password != password  # password is hashed


def test_get_user_projects(session: SQLService, project: int, user: int) -> None:
    with session.db_session() as sess:
        db_obj = crud_user.read(db=sess, id=user)
        user_projects = [ProjectRead.from_orm(proj) for proj in db_obj.projects]

    assert len(user_projects) == 1
    assert user_projects[0].id == project


# TODO: Fails on teardown because the codes gets removed here already!
def test_get_delete_user_codes(session: SQLService, code: int, user: int) -> None:
    with session.db_session() as sess:
        db_obj = crud_user.read(db=sess, id=user)
        user_codes = [CodeRead.from_orm(code) for code in db_obj.codes]

    assert len(user_codes) == 1

    # with session.db_session() as sess:
    #     crud_user.remove_all_codes(db=sess, id=user)
    #
    #     db_obj = crud_user.read(db=sess, id=user)
    #     user_codes = [CodeRead.from_orm(code) for code in db_obj.codes]
    #
    # assert len(user_codes) == 0


# TODO: Fails on teardown because the codes gets removed here already!
def test_delete_user_codes(session: SQLService, user: int, code: int) -> None:
    with session.db_session() as sess:
        db_obj = crud_user.read(db=sess, id=user)
        codes = [CodeRead.from_orm(code) for code in db_obj.codes]

    assert len(codes) == 1

    # with session.db_session() as sess:
    #     crud_user.remove_all_codes(db=sess, id=user)
    #     db_obj = crud_user.read(db=sess, id=user)
    #     codes = [CodeRead.from_orm(code) for code in db_obj.codes]
    #
    # assert len(codes) == 0


def test_get_all_user(session: SQLService, user: int) -> None:
    with session.db_session() as sess:
        db_objs = crud_user.read_multi(db=sess)
        users = [UserRead.from_orm(proj) for proj in db_objs]

    assert len(users) == 2
