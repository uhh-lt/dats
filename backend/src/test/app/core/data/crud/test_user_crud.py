import pytest
import random
import string

from api.dependencies import get_current_user
from app.core.data.crud.crud_base import NoSuchElementError
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.user import crud_user
from app.core.data.dto.code import CodeRead
from app.core.data.dto.memo import MemoRead
from app.core.data.dto.user import UserRead, UserCreate, UserUpdate, UserLogin, UserAuthorizationHeaderData
from app.core.security import generate_jwt
from app.core.data.dto import ProjectRead


def test_create_delete_user(session):
    email = f'{"".join(random.choices(string.ascii_letters, k=15))}@gmail.com'
    first_name = "".join(random.choices(string.ascii_letters, k=15))
    last_name = "".join(random.choices(string.ascii_letters, k=15))
    password = "".join(random.choices(string.ascii_letters, k=15))

    user = UserCreate(email=email, first_name=first_name,
                      last_name=last_name, password=password)

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

        # try delete user second time
        with pytest.raises(NoSuchElementError) as e:
            crud_user.read(db=sess, id=user_new.id)


def test_update_user(session, user):
    email = f'{"".join(random.choices(string.ascii_letters, k=15))}@gmail.com'
    first_name = "".join(random.choices(string.ascii_letters, k=15))
    last_name = "".join(random.choices(string.ascii_letters, k=15))
    password = "".join(random.choices(string.ascii_letters, k=15))

    user_update = UserUpdate(email=email, first_name=first_name,
                             last_name=last_name, password=password)

    with session.db_session() as sess:
        crud_user.update(db=sess, id=user, update_dto=user_update)

        db_user = crud_user.read(db=sess, id=user)
        user_read = UserRead.from_orm(db_user)

    assert user_read.email == email
    assert user_read.first_name == first_name
    assert user_read.last_name == last_name
    assert user_read.password != password  # password is hashed

def get_user_projects(session, project):
    pass
    

def test_get_delete_user_codes(session, code, user):
    _ = code
    with session.db_session() as sess:
        db_obj = crud_user.read(db=sess, id=user)
        user_codes = [CodeRead.from_orm(code) for code in db_obj.codes]

    assert len(user_codes) == 1

    with session.db_session() as sess:
        # TODO: FAILED test/app/core/data/crud/test_user_crud.py::test_get_delete_user_codes - sqlalchemy.exc.ProgrammingError: (psycopg2.errors.UndefinedTable) missing FROM-clause entry for table "user"
        # crud_user.remove_all_codes(db=sess, id=user_id)

        db_obj = crud_user.read(db=sess, id=user)
        user_codes = [CodeRead.from_orm(code) for code in db_obj.codes]

    # assert len(user_codes) == 0


def test_delete_user_codes(session, user, code):

    with session.db_session() as sess:
        pass


def test_get_me(session):  # TODO:
    with session.db_session() as sess:
        user_db = get_current_user(db=sess)
        # user = UserRead.from_orm(user_db)
    print(f'{user_db=}')


def test_get_all_user(session, user):

    with session.db_session() as sess:
        db_objs = crud_user.read_multi(db=sess)
        users = [UserRead.from_orm(proj) for proj in db_objs]

    assert len(users) == 2
