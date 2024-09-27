import random
import string
from typing import Any, Dict

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

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
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.user import UserORM
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


def test_update_project(
    db: Session, sql_service: SQLService, project: ProjectORM
) -> None:
    title2 = "".join(random.choices(string.ascii_letters, k=15))
    description2 = "Meow"

    # update project title
    crud_project.update(db=db, id=project.id, update_dto=ProjectUpdate(title=title2))

    assert project.title == title2

    # update project description
    crud_project.update(
        db=db, id=project.id, update_dto=ProjectUpdate(description=description2)
    )

    assert project.title == title2
    assert project.description == description2

    # try update title to None
    with pytest.raises(IntegrityError):
        # Use a throwaway session that will become unusable due
        # to the exeption
        with sql_service.db_session() as db:
            crud_project.update(
                db=db, id=project.id, update_dto=ProjectUpdate(title=None)
            )

    # try update description to None
    with pytest.raises(IntegrityError):
        # Use a throwaway session that will become unusable due
        # to the exeption
        with sql_service.db_session() as db:
            crud_project.update(
                db=db, id=project.id, update_dto=ProjectUpdate(description=None)
            )

    # check if nothing has changed
    assert project.title == title2
    assert project.description == description2


def test_create_remove_project(db: Session) -> None:
    # check empty database
    dbs = crud_project.read_multi(db=db)

    p = [ProjectRead.model_validate(proj) for proj in dbs]

    assert len(p) == 0

    # create new project
    title = "".join(random.choices(string.ascii_letters, k=15))
    description = "Test description"

    system_user = UserRead.model_validate(crud_user.read(db, SYSTEM_USER_ID))
    id = crud_project.create(
        db=db,
        create_dto=ProjectCreate(title=title, description=description),
        creating_user=system_user,
    ).id

    # check database again
    dbs = crud_project.read_multi(db=db)

    p = [ProjectRead.model_validate(proj) for proj in dbs]

    assert len(p) == 1
    assert p[0].id == id
    assert p[0].title == title
    assert p[0].description == description

    # remove project and check database
    crud_project.remove(db=db, id=id)
    dbs = crud_project.read_multi(db=db)
    p = [ProjectRead.model_validate(proj) for proj in dbs]

    assert len(p) == 0

    # try remove project second time
    with pytest.raises(NoSuchElementError):
        crud_project.remove(db=db, id=id)


# project user


def test_project_users(db: Session, project: ProjectORM, user: UserORM) -> None:
    project_users = [UserRead.model_validate(user) for user in project.users]

    assert len(project_users) == 2

    # create third user
    email = f'{"".join(random.choices(string.ascii_letters, k=15))}@gmail.com'
    first_name = "".join(random.choices(string.ascii_letters, k=15))
    last_name = "".join(random.choices(string.ascii_letters, k=15))
    password = "".join(random.choices(string.ascii_letters, k=15))

    user_three = UserCreate(
        email=email, first_name=first_name, last_name=last_name, password=password
    )

    db_user = crud_user.create(db=db, create_dto=user_three)
    user_three_orm = UserRead.model_validate(db_user)

    crud_project.associate_user(db=db, proj_id=project.id, user_id=user_three_orm.id)

    proj_db_obj = crud_project.read(db=db, id=project.id)
    project_users = [UserRead.model_validate(user) for user in proj_db_obj.users]

    assert len(project_users) == 3
    assert project_users[2].id == user_three_orm.id

    crud_user.remove(db=db, id=user_three_orm.id)

    proj_db_obj = crud_project.read(db=db, id=project.id)
    project_users = [UserRead.model_validate(user) for user in proj_db_obj.users]

    assert len(project_users) == 2
    assert project_users[1].id == user.id


# project codes


def test_get_remove_project_codes(db: Session, project: ProjectORM) -> None:
    proj_db_obj = crud_project.read(db=db, id=project.id)

    s = [CodeRead.model_validate(code) for code in proj_db_obj.codes]

    assert len(s) == get_number_of_system_codes()

    # removes all project codes

    crud_code.remove_by_project(db=db, proj_id=project.id)

    proj_db_obj = crud_project.read(db=db, id=project.id)
    s = [CodeRead.model_validate(code) for code in proj_db_obj.codes]

    assert len(s) == 0


# project tags


def test_get_project_tags(db: Session, project: ProjectORM) -> None:
    proj_db_obj = crud_project.read(db=db, id=project.id)
    s = [DocumentTagRead.model_validate(tag) for tag in proj_db_obj.document_tags]

    assert len(s) == 0


# user memos


def test_get_add_remove_memos_project(
    db: Session, project: ProjectORM, user: UserORM
) -> None:
    db_objs = crud_memo.read_by_user_and_project(
        db=db, user_id=user.id, proj_id=project.id, only_starred=False
    )
    memo_list = [
        crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj) for db_obj in db_objs
    ]

    assert len(memo_list) == 0

    # add memo1
    title1 = "".join(random.choices(string.ascii_letters, k=30))
    content1 = "".join(random.choices(string.ascii_letters, k=30))
    starred1 = False
    memo1 = MemoCreate(
        title=title1,
        content=content1,
        user_id=user.id,
        project_id=project.id,
        starred=starred1,
    )

    db_obj = crud_memo.create_for_project(
        db=db, project_id=project.id, create_dto=memo1
    )
    db.add(project)
    db.refresh(project)
    db.add(user)
    db.refresh(user)
    memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
    MemoRead(
        **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
        attached_object_id=project.id,
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
        user_id=user.id,
        project_id=project.id,
        starred=starred2,
    )

    db_obj = crud_memo.create_for_project(
        db=db, project_id=project.id, create_dto=memo2
    )
    db.add(project)
    db.refresh(project)
    db.add(user)
    db.refresh(user)
    memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
    MemoRead(
        **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
        attached_object_id=project.id,
        attached_object_type=AttachedObjectType.project,
    )

    # print(f'{memo2_obj=}')

    db_objs_unstarred = crud_memo.read_by_user_and_project(
        db=db, user_id=user.id, proj_id=project.id, only_starred=False
    )
    memo_list_unstarred = [
        crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj)
        for db_obj in db_objs_unstarred
    ]
    db_objs_starred = crud_memo.read_by_user_and_project(
        db=db, user_id=user.id, proj_id=project.id, only_starred=True
    )
    memo_list_starred = [
        crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj)
        for db_obj in db_objs_starred
    ]

    assert len(memo_list_unstarred) == 2

    assert len(memo_list_starred) == 1

    # remove memos

    crud_memo.remove_by_user_and_project(db=db, user_id=user.id, proj_id=project.id)
    db_objs = crud_memo.read_by_user_and_project(
        db=db, user_id=user.id, proj_id=project.id, only_starred=False
    )
    memo_list = [
        crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj) for db_obj in db_objs
    ]

    assert len(memo_list) == 0
