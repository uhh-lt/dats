import random
import string
from typing import Any, Dict

import pytest
from sqlalchemy.exc import IntegrityError

from app.core.data.crud.code import crud_code
from app.core.data.crud.crud_base import NoSuchElementError
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.project import crud_project
from app.core.data.crud.user import SYSTEM_USER_ID, crud_user
from app.core.data.dto.code import CodeRead
from app.core.data.dto.document_tag import DocumentTagRead
from app.core.data.dto.memo import AttachedObjectType, MemoCreate, MemoInDB, MemoRead
from app.core.data.dto.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.core.data.dto.user import UserCreate, UserRead
from app.core.db.sql_service import SQLService
from config import conf


def get_number_of_system_codes() -> int:
    def __count_codes_recursively(
        code_dict: Dict[str, Dict[str, Any]], num: int, names
    ):
        for code_name in code_dict.keys():
            num += 1
            if code_name in names:
                print(f"CODENAME: {code_name=}")
            names.add(code_name)
            if "children" in code_dict[code_name]:
                num = __count_codes_recursively(
                    code_dict[code_name]["children"], num, names
                )
        return num

    return __count_codes_recursively(conf.system_codes, 0, set())


def test_update_project(session: SQLService, project: int) -> None:
    title2 = "".join(random.choices(string.ascii_letters, k=15))
    description2 = "Meow"

    # update project title
    with session.db_session() as sess:
        crud_project.update(db=sess, id=project, update_dto=ProjectUpdate(title=title2))

    with session.db_session() as sess:
        p = ProjectRead.model_validate(crud_project.read(db=sess, id=project))

    assert p.id == project
    assert p.title == title2

    # update project description
    with session.db_session() as sess:
        crud_project.update(
            db=sess, id=project, update_dto=ProjectUpdate(description=description2)
        )

    with session.db_session() as sess:
        p = ProjectRead.model_validate(crud_project.read(db=sess, id=project))

    assert p.id == project
    assert p.title == title2
    assert p.description == description2

    # try update title to None
    with pytest.raises(IntegrityError):
        with session.db_session() as sess:
            crud_project.update(
                db=sess, id=project, update_dto=ProjectUpdate(title=None)
            )

    # try update description to None
    with pytest.raises(IntegrityError):
        with session.db_session() as sess:
            crud_project.update(
                db=sess, id=project, update_dto=ProjectUpdate(description=None)
            )

    # check if nothing has changed
    with session.db_session() as sess:
        p = ProjectRead.model_validate(crud_project.read(db=sess, id=project))

    assert p.id == project
    assert p.title == title2
    assert p.description == description2


def test_create_remove_project(session: SQLService) -> None:
    # check empty database
    with session.db_session() as sess:
        dbs = crud_project.read_multi(db=sess)

    with session.db_session() as sess:
        p = [ProjectRead.model_validate(proj) for proj in dbs]

    assert len(p) == 0

    # create new project
    title = "".join(random.choices(string.ascii_letters, k=15))
    description = "Test description"

    with session.db_session() as sess:
        id = crud_project.create(
            db=sess, create_dto=ProjectCreate(title=title, description=description)
        ).id

    # check database again
    with session.db_session() as sess:
        dbs = crud_project.read_multi(db=sess)

    with session.db_session() as sess:
        p = [ProjectRead.model_validate(proj) for proj in dbs]

    assert len(p) == 1
    assert p[0].id == id
    assert p[0].title == title
    assert p[0].description == description

    # remove project and check database
    with session.db_session() as sess:
        crud_project.remove(db=sess, id=id)
        dbs = crud_project.read_multi(db=sess)
        p = [ProjectRead.model_validate(proj) for proj in dbs]

    assert len(p) == 0

    # try remove project second time
    with pytest.raises(NoSuchElementError):
        with session.db_session() as sess:
            crud_project.remove(db=sess, id=id)


# project user


def test_project_users(session: SQLService, project: int, user: int) -> None:
    with session.db_session() as sess:
        users = crud_project.read(db=sess, id=project)

        project_users = [UserRead.model_validate(user) for user in users.users]

    assert len(project_users) == 2

    # create third user
    email = f'{"".join(random.choices(string.ascii_letters, k=15))}@gmail.com'
    first_name = "".join(random.choices(string.ascii_letters, k=15))
    last_name = "".join(random.choices(string.ascii_letters, k=15))
    password = "".join(random.choices(string.ascii_letters, k=15))

    user_three = UserCreate(
        email=email, first_name=first_name, last_name=last_name, password=password
    )

    with session.db_session() as sess:
        db_user = crud_user.create(db=sess, create_dto=user_three)
        user_three_orm = UserRead.model_validate(db_user)

    with session.db_session() as sess:
        crud_project.associate_user(db=sess, proj_id=project, user_id=user_three_orm.id)

        proj_db_obj = crud_project.read(db=sess, id=project)
        project_users = [UserRead.model_validate(user) for user in proj_db_obj.users]

    assert len(project_users) == 3
    assert project_users[2].id == user_three_orm.id

    with session.db_session() as sess:
        crud_user.remove(db=sess, id=user_three_orm.id)

        proj_db_obj = crud_project.read(db=sess, id=project)
        project_users = [UserRead.model_validate(user) for user in proj_db_obj.users]

    assert len(project_users) == 2
    assert project_users[1].id == user


# project codes


def test_get_remove_project_codes(session: SQLService, project: int) -> None:
    with session.db_session() as sess:
        proj_db_obj = crud_project.read(db=sess, id=project)

        s = [CodeRead.model_validate(code) for code in proj_db_obj.codes]

    assert len(s) == get_number_of_system_codes()

    # removes all project codes

    with session.db_session() as sess:
        crud_code.remove_by_project(db=sess, proj_id=project)

        proj_db_obj = crud_project.read(db=sess, id=project)
        s = [CodeRead.model_validate(code) for code in proj_db_obj.codes]

    assert len(s) == 0


# project tags


def test_get_project_tags(session: SQLService, project: int) -> None:
    with session.db_session() as sess:
        proj_db_obj = crud_project.read(db=sess, id=project)
        s = [DocumentTagRead.model_validate(tag) for tag in proj_db_obj.document_tags]

    assert len(s) == 0


# user codes


def test_get_remove_project_system_user_codes(
    session: SQLService, project: int
) -> None:
    with session.db_session() as sess:
        s = [
            CodeRead.model_validate(code_db_obj)
            for code_db_obj in crud_code.read_by_user_and_project(
                db=sess, user_id=SYSTEM_USER_ID, proj_id=project
            )
        ]

    assert len(s) == get_number_of_system_codes()

    # remove user codes

    with session.db_session() as sess:
        crud_code.remove_by_user_and_project(
            db=sess, user_id=SYSTEM_USER_ID, proj_id=project
        )
        s = [
            CodeRead.model_validate(code_db_obj)
            for code_db_obj in crud_code.read_by_user_and_project(
                db=sess, user_id=SYSTEM_USER_ID, proj_id=project
            )
        ]

    assert len(s) == 0


# user memos


def test_get_add_remove_memos_project(
    session: SQLService, project: int, user: int
) -> None:
    with session.db_session() as sess:
        db_objs = crud_memo.read_by_user_and_project(
            db=sess, user_id=user, proj_id=project, only_starred=False
        )
        memo_list = [
            crud_memo.get_memo_read_dto_from_orm(db=sess, db_obj=db_obj)
            for db_obj in db_objs
        ]

    assert len(memo_list) == 0

    # add memo1
    title1 = "".join(random.choices(string.ascii_letters, k=30))
    content1 = "".join(random.choices(string.ascii_letters, k=30))
    starred1 = False
    memo1 = MemoCreate(
        title=title1,
        content=content1,
        user_id=user,
        project_id=project,
        starred=starred1,
    )

    with session.db_session() as sess:
        db_obj = crud_memo.create_for_project(
            db=sess, project_id=project, create_dto=memo1
        )
        memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
        MemoRead(
            **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
            attached_object_id=project,
            attached_object_type=AttachedObjectType.project,
        )

    # print(f'{memo1_obj=}')

    # add memo2
    title2 = "".join(random.choices(string.ascii_letters, k=30))
    content2 = "".join(random.choices(string.ascii_letters, k=30))
    starred2 = True
    memo2 = MemoCreate(
        title=title2,
        content=content2,
        user_id=user,
        project_id=project,
        starred=starred2,
    )

    with session.db_session() as sess:
        db_obj = crud_memo.create_for_project(
            db=sess, project_id=project, create_dto=memo2
        )
        memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
        MemoRead(
            **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
            attached_object_id=project,
            attached_object_type=AttachedObjectType.project,
        )

    # print(f'{memo2_obj=}')

    with session.db_session() as sess:
        db_objs_unstarred = crud_memo.read_by_user_and_project(
            db=sess, user_id=user, proj_id=project, only_starred=False
        )
        memo_list_unstarred = [
            crud_memo.get_memo_read_dto_from_orm(db=sess, db_obj=db_obj)
            for db_obj in db_objs_unstarred
        ]
        db_objs_starred = crud_memo.read_by_user_and_project(
            db=sess, user_id=user, proj_id=project, only_starred=True
        )
        memo_list_starred = [
            crud_memo.get_memo_read_dto_from_orm(db=sess, db_obj=db_obj)
            for db_obj in db_objs_starred
        ]

    assert len(memo_list_unstarred) == 2

    assert len(memo_list_starred) == 1

    # remove memos

    with session.db_session() as sess:
        crud_memo.remove_by_user_and_project(db=sess, user_id=user, proj_id=project)
        db_objs = crud_memo.read_by_user_and_project(
            db=sess, user_id=user, proj_id=project, only_starred=False
        )
        memo_list = [
            crud_memo.get_memo_read_dto_from_orm(db=sess, db_obj=db_obj)
            for db_obj in db_objs
        ]

    assert len(memo_list) == 0
