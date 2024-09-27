import random
import string

import pytest
from sqlalchemy.orm import Session

from api.util import get_object_memo_for_user, get_object_memos
from app.core.data.crud.code import crud_code
from app.core.data.crud.crud_base import NoSuchElementError
from app.core.data.crud.memo import crud_memo
from app.core.data.dto.code import CodeCreate, CodeRead, CodeUpdate
from app.core.data.dto.memo import AttachedObjectType, MemoCreate, MemoInDB, MemoRead
from app.core.data.orm.code import CodeORM
from app.core.data.orm.project import ProjectORM
from app.core.data.orm.user import UserORM


def test_create_get_delete_code(
    db: Session, project: ProjectORM, user: UserORM
) -> None:
    name = "".join(random.choices(string.ascii_letters, k=15))
    description = "".join(random.choices(string.ascii_letters, k=30))
    color = f"rgb({random.randint(0, 255)},{random.randint(0, 255)},{random.randint(0, 255)})"
    code = CodeCreate(
        name=name,
        color=color,
        description=description,
        project_id=project.id,
        is_system=False,
    )

    # create code
    db_code = crud_code.create(db=db, create_dto=code)
    new_code = CodeRead.model_validate(db_code)
    code_id = new_code.id

    # get code
    db_obj = crud_code.read(db=db, id=code_id)
    get_code = [CodeRead.model_validate(db_obj)]

    assert len(get_code) == 1
    assert get_code[0].name == name
    assert get_code[0].description == description
    assert get_code[0].color == color

    # delete code
    crud_code.remove(db=db, id=code_id)

    # try to get already removed code
    with pytest.raises(NoSuchElementError):
        db_obj = crud_code.read(db=db, id=code_id)


def test_update_code(db: Session, code: CodeORM) -> None:
    name = "".join(random.choices(string.ascii_letters, k=15))
    description = "".join(random.choices(string.ascii_letters, k=30))
    color = f"rgb({random.randint(0, 255)},{random.randint(0, 255)},{random.randint(0, 255)})"

    # update all fields
    code_new = CodeUpdate(name=name, description=description, color=color)
    db_obj = crud_code.update(db=db, id=code.id, update_dto=code_new)
    get_code = [CodeRead.model_validate(db_obj)]

    assert len(get_code) == 1
    assert get_code[0].name == name
    assert get_code[0].description == description
    assert get_code[0].color == color

    # update nothing
    code_new2 = CodeUpdate()
    db_obj = crud_code.update(db=db, id=code.id, update_dto=code_new2)
    get_code2 = [CodeRead.model_validate(db_obj)]

    assert len(get_code2) == 1
    assert get_code2[0].name == name
    assert get_code2[0].description == description
    assert get_code2[0].color == color


def test_add_get_memo(
    db: Session, code: CodeORM, project: ProjectORM, user: UserORM
) -> None:
    title = "".join(random.choices(string.ascii_letters, k=15))
    content = "".join(random.choices(string.ascii_letters, k=30))
    starred = False

    memo = MemoCreate(
        title=title,
        content=content,
        user_id=user.id,
        project_id=project.id,
        starred=starred,
    )
    db_obj = crud_memo.create_for_code(db=db, code_id=code.id, create_dto=memo)
    memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
    memo_new = [
        MemoRead(
            **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
            attached_object_id=db_obj.id,
            attached_object_type=AttachedObjectType.code,
        )
    ]

    assert len(memo_new) == 1
    assert memo_new[0].title == title
    assert memo_new[0].content == content
    assert memo_new[0].starred == starred

    # get memo
    db_obj = crud_code.read(db=db, id=code.id)
    memos = get_object_memos(db_obj=db_obj)

    # print(f'{memos=}')

    assert len(memos) == 1
    assert memos[0].title == title
    assert memos[0].content == content
    assert memos[0].starred == starred

    # get not existing memo
    with pytest.raises(NoSuchElementError):
        db_obj = crud_code.read(db=db, id=31337)

    # get user memo
    db_obj = crud_code.read(db=db, id=code.id)
    memos_user = [get_object_memo_for_user(db_obj=db_obj, user_id=user.id)]

    assert len(memos_user) == 1
    assert memos_user[0].title == title
    assert memos_user[0].content == content
    assert memos_user[0].starred == starred
