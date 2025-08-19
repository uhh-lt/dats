import random
import string
from typing import Any
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from config import conf
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import AttachedObjectType, MemoCreateIntern, MemoInDB, MemoRead
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate, ProjectRead, ProjectUpdate
from core.project.project_orm import ProjectORM
from core.tag.tag_dto import TagRead
from core.user.user_crud import SYSTEM_USER_ID, crud_user
from core.user.user_dto import UserCreate, UserRead
from core.user.user_orm import UserORM
from repos.db.crud_base import NoSuchElementError
from repos.db.sql_repo import SQLRepo


def get_number_of_system_codes() -> int:
    def __count_codes_recursively(
        code_dict: dict[str, dict[str, Any]], num: int, names
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


def test_update_project(db: Session, sql_repo: SQLRepo, project: ProjectORM) -> None:
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
        with sql_repo.db_session() as db:
            crud_project.update(
                db=db, id=project.id, update_dto=ProjectUpdate(title=None)
            )

    # try update description to None
    with pytest.raises(IntegrityError):
        # Use a throwaway session that will become unusable due
        # to the exeption
        with sql_repo.db_session() as db:
            crud_project.update(
                db=db, id=project.id, update_dto=ProjectUpdate(description=None)
            )

    # check if nothing has changed
    assert project.title == title2
    assert project.description == description2


def test_create_remove_project(db: Session) -> None:
    # check status of database
    dbs = crud_project.read_multi(db=db)

    all_projects = [ProjectRead.model_validate(proj) for proj in dbs]

    before = len(all_projects)

    # create new project
    title = "".join(random.choices(string.ascii_letters, k=15))
    description = "Test description"

    system_user = crud_user.read(db, SYSTEM_USER_ID)
    id = crud_project.create(
        db=db,
        create_dto=ProjectCreate(title=title, description=description),
        creating_user=system_user,
    ).id

    # check database again
    dbs = crud_project.read_multi(db=db)

    all_projects = [ProjectRead.model_validate(proj) for proj in dbs]

    project = ProjectRead.model_validate(crud_project.read(db=db, id=id))

    assert len(all_projects) == before + 1
    assert project.id == id
    assert project.title == title
    assert project.description == description

    # remove project and check database
    crud_project.delete(db=db, id=id)
    dbs = crud_project.read_multi(db=db)
    all_projects = [ProjectRead.model_validate(proj) for proj in dbs]

    assert len(all_projects) == before

    # try remove project second time
    with pytest.raises(NoSuchElementError):
        crud_project.delete(db=db, id=id)


# project user


def test_project_users(db: Session, project: ProjectORM, user: UserORM) -> None:
    project_users = [UserRead.model_validate(user) for user in project.users]
    # System, Demo, Assistant Zero, Assistant Few, Assistant Trained
    assert len(project_users) == 5

    # create sixth user
    email = f"{''.join(random.choices(string.ascii_letters, k=15))}@gmail.com"
    first_name = "".join(random.choices(string.ascii_letters, k=15))
    last_name = "".join(random.choices(string.ascii_letters, k=15))
    password = "".join(random.choices(string.ascii_letters, k=15))

    user_six = UserCreate(
        email=email, first_name=first_name, last_name=last_name, password=password
    )

    db_user = crud_user.create(db=db, create_dto=user_six)
    user_six_orm = UserRead.model_validate(db_user)

    crud_project.associate_user(db=db, proj_id=project.id, user_id=user_six_orm.id)

    proj_db_obj = crud_project.read(db=db, id=project.id)
    project_users = [UserRead.model_validate(user) for user in proj_db_obj.users]

    assert len(project_users) == 6
    assert project_users[5].id == user_six_orm.id

    crud_user.delete(db=db, id=user_six_orm.id)

    proj_db_obj = crud_project.read(db=db, id=project.id)
    project_users = [UserRead.model_validate(user) for user in proj_db_obj.users]

    assert len(project_users) == 5
    assert project_users[4].id == user.id


# project tags


def test_get_project_tags(db: Session, project: ProjectORM) -> None:
    proj_db_obj = crud_project.read(db=db, id=project.id)
    s = [TagRead.model_validate(tag) for tag in proj_db_obj.tags]

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

    # there is already one memo auto created for each user and project
    assert len(memo_list) == 1

    # add memo1
    title1 = "".join(random.choices(string.ascii_letters, k=30))
    content1 = "".join(random.choices(string.ascii_letters, k=30))
    json1 = "{}"
    starred1 = False
    memo1 = MemoCreateIntern(
        uuid=str(uuid4()),
        title=title1,
        content=content1,
        content_json=json1,
        user_id=user.id,
        project_id=project.id,
        starred=starred1,
    )

    db_obj = crud_memo.create_for_attached_object(
        db=db,
        attached_object_id=project.id,
        attached_object_type=AttachedObjectType.project,
        create_dto=memo1,
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

    # add memo2
    title2 = "".join(random.choices(string.ascii_letters, k=30))
    content2 = "".join(random.choices(string.ascii_letters, k=30))
    json2 = "{}"
    starred2 = True
    memo2 = MemoCreateIntern(
        uuid=str(uuid4()),
        title=title2,
        content=content2,
        content_json=json2,
        user_id=user.id,
        project_id=project.id,
        starred=starred2,
    )

    db_obj = crud_memo.create_for_attached_object(
        db=db,
        attached_object_id=project.id,
        attached_object_type=AttachedObjectType.project,
        create_dto=memo2,
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

    assert len(memo_list_unstarred) == 3

    assert len(memo_list_starred) == 1

    # remove memos
    crud_memo.delete_by_user_and_project(db=db, user_id=user.id, proj_id=project.id)
    db_objs = crud_memo.read_by_user_and_project(
        db=db, user_id=user.id, proj_id=project.id, only_starred=False
    )
    memo_list = [
        crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj) for db_obj in db_objs
    ]

    assert len(memo_list) == 0
