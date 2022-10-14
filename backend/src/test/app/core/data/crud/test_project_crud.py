from typing import List, Dict

import pytest
import random
import string

from api.util import get_object_memos
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto.memo import MemoInDB, MemoCreate, AttachedObjectType, MemoRead
from app.core.data.dto.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.core.data.dto.source_document import SourceDocumentRead
from app.core.data.dto.user import UserRead
from app.docprepro.util import preprocess_uploaded_file

def test_update_project(session, project):
    title2 = "".join(random.choices(string.ascii_letters, k=15))
    description2 = "Meow"

    # create project
    id, title, description = project

    with session.db_session() as sess:
        p = ProjectRead.from_orm(crud_project.read(db=sess, id=id))

    assert p.title == title
    assert p.description == description
    assert p.id == id

    # update project title
    with session.db_session() as sess:
        crud_project.update(
            db=sess, id=id, update_dto=ProjectUpdate(title=title2))

    with session.db_session() as sess:
        p = ProjectRead.from_orm(crud_project.read(db=sess, id=id))

    assert p.id == id
    assert p.title == title2
    assert p.description == description

    # update project description
    with session.db_session() as sess:
        crud_project.update(
            db=sess, id=id, update_dto=ProjectUpdate(description=description2))

    with session.db_session() as sess:
        p = ProjectRead.from_orm(crud_project.read(db=sess, id=id))

    assert p.id == id
    assert p.title == title2
    assert p.description == description2

    # try update title to None
    with pytest.raises(Exception) as e_info:  # TODO: Catch correct Exception
        with session.db_session() as sess:
            crud_project.update(
                db=sess, id=id, update_dto=ProjectUpdate(title=None))

    # try update description to None
    with pytest.raises(Exception) as e_info:  # TODO: Catch correct Exception
        with session.db_session() as sess:
            crud_project.update(
                db=sess, id=id, update_dto=ProjectUpdate(description=None))

    # check if nothing has changed
    with session.db_session() as sess:
        p = ProjectRead.from_orm(crud_project.read(db=sess, id=id))

    assert p.id == id
    assert p.title == title2
    assert p.description == description2


def test_create_remove_project(session):

    # check empty database
    with session.db_session() as sess:
        dbs = crud_project.read_multi(db=sess)

    with session.db_session() as sess:
        p = [ProjectRead.from_orm(proj) for proj in dbs]

    assert len(p) == 0

    # create new project
    title = "".join(random.choices(string.ascii_letters, k=15))
    description = "Test description"

    with session.db_session() as sess:
        id = crud_project.create(db=sess, create_dto=ProjectCreate(
            title=title, description=description)).id

    # check database again
    with session.db_session() as sess:
        dbs = crud_project.read_multi(db=sess)

    with session.db_session() as sess:
        p = [ProjectRead.from_orm(proj) for proj in dbs]

    assert len(p) == 1
    assert p[0].id == id
    assert p[0].title == title
    assert p[0].description == description

    # remove project and check database
    with session.db_session() as sess:
        crud_project.remove(db=sess, id=id)
        dbs = crud_project.read_multi(db=sess)
        p = [ProjectRead.from_orm(proj) for proj in dbs]

    assert len(p) == 0

    # try remove project second time
    with pytest.raises(Exception) as e_info:  # TODO: Catch correct Exception
        with session.db_session() as sess:
            r = crud_project.remove(db=sess, id=id)

# user memos


def test_get_add_remove_memos_project(session, project):
    id, *_ = project

    with session.db_session() as sess:
        db_objs = crud_memo.read_by_user_and_project(
            db=sess, user_id=1, proj_id=id, only_starred=False)
        memo_list = [crud_memo.get_memo_read_dto_from_orm(
            db=sess, db_obj=db_obj) for db_obj in db_objs]

    len(memo_list) == 0

    # add memo1
    title1 = "".join(random.choices(string.ascii_letters, k=30))
    content1 = "".join(random.choices(string.ascii_letters, k=30))
    starred1 = False
    memo1 = MemoCreate(title=title1, content=content1,
                       user_id=1, project_id=id, starred=starred1)

    with session.db_session() as sess:
        db_obj = crud_memo.create_for_project(
            db=sess, project_id=id, create_dto=memo1)
        memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
        memo1_obj = MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                             attached_object_id=id,
                             attached_object_type=AttachedObjectType.project)

    print(f'{memo1_obj=}')

    # add memo2
    title2 = "".join(random.choices(string.ascii_letters, k=30))
    content2 = "".join(random.choices(string.ascii_letters, k=30))
    starred2 = True
    memo2 = MemoCreate(title=title2, content=content2,
                       user_id=1, project_id=id, starred=starred2)

    with session.db_session() as sess:
        db_obj = crud_memo.create_for_project(
            db=sess, project_id=id, create_dto=memo2)
        memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
        memo2_obj = MemoRead(**memo_as_in_db_dto.dict(exclude={"attached_to"}),
                             attached_object_id=id,
                             attached_object_type=AttachedObjectType.project)

    print(f'{memo2_obj=}')

    with session.db_session() as sess:
        db_objs_unstarred = crud_memo.read_by_user_and_project(
            db=sess, user_id=1, proj_id=id, only_starred=False)
        memo_list_unstarred = [crud_memo.get_memo_read_dto_from_orm(
            db=sess, db_obj=db_obj) for db_obj in db_objs_unstarred]
        db_objs_starred = crud_memo.read_by_user_and_project(
            db=sess, user_id=1, proj_id=id, only_starred=True)
        memo_list_starred = [crud_memo.get_memo_read_dto_from_orm(
            db=sess, db_obj=db_obj) for db_obj in db_objs_starred]

    assert len(memo_list_unstarred) == 2

    assert len(memo_list_starred) == 1

    # remove memos

    with session.db_session() as sess:
        crud_memo.remove_by_user_and_project(db=sess, user_id=1, proj_id=id)
        db_objs = crud_memo.read_by_user_and_project(
            db=sess, user_id=1, proj_id=id, only_starred=False)
        memo_list = [crud_memo.get_memo_read_dto_from_orm(
            db=sess, db_obj=db_obj) for db_obj in db_objs]

    assert len(memo_list) == 0
