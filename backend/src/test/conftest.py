import pytest
import random
import string

from app.core.data.crud.code import crud_code
from app.core.data.crud.project import crud_project
from app.core.data.crud.user import crud_user
from app.core.data.dto.code import CodeRead, CodeCreate
from app.core.data.dto.project import ProjectCreate
from app.core.data.dto.user import UserRead, UserCreate
from app.core.db.sql_service import SQLService


@pytest.fixture
def code(session, project, user):
    project_id, *_ = project
    name = "".join(random.choices(string.ascii_letters, k=15))
    description = "".join(random.choices(string.ascii_letters, k=30))
    color = f"rgb({random.randint(0, 255)},{random.randint(0, 255)},{random.randint(0, 255)})"
    code = CodeCreate(name=name, color=color,
                      description=description, project_id=project_id, user_id=user)

    with session.db_session() as sess:
        db_code = crud_code.create(db=sess, create_dto=code)
        code_obj = CodeRead.from_orm(db_code)

    yield code_obj

    with session.db_session() as sess:
        crud_code.remove(db=sess, id=code_obj.id)


@pytest.fixture
def session():
    return SQLService()


@pytest.fixture
def project(session):
    title = "".join(random.choices(string.ascii_letters, k=15))
    description = "Test description"

    with session.db_session() as sess:
        id = crud_project.create(db=sess,
                                 create_dto=ProjectCreate(title=title, description=description)).id

    yield id, title, description

    with session.db_session() as sess:
        crud_project.remove(db=sess, id=id)


@pytest.fixture
def user(session):
    email = f'{"".join(random.choices(string.ascii_letters, k=15))}@gmail.com'
    first_name = "".join(random.choices(string.ascii_letters, k=15))
    last_name = "".join(random.choices(string.ascii_letters, k=15))
    password = "".join(random.choices(string.ascii_letters, k=15))

    user = UserCreate(email=email, first_name=first_name,
                      last_name=last_name, password=password)

    with session.db_session() as sess:
        # create user
        db_user = crud_user.create(db=sess, create_dto=user)
        user = UserRead.from_orm(db_user)

    yield user.id

    with session.db_session() as sess:
        crud_user.remove(db=sess, id=user.id)
