"""Contract of SQLCRUDBase: input order, duplicates, empty input and delegation."""

import pytest
from sqlalchemy.orm import Session

from common.common_exceptions import DuplicateIdsError
from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import TagCreate, TagUpdate
from core.tag.tag_orm import TagORM
from repos.db import crud_base
from repos.db.crud_base import SQLCRUDBase
from repos.db.sql_exceptions import NoSuchElementError

from .conftest import ProjectWithTags

# Shuffled positions of the fixture's five tags (ids ascend with the position)
SHUFFLED = [3, 0, 4, 1, 2]


@pytest.fixture
def small_batches(monkeypatch: pytest.MonkeyPatch) -> None:
    """Split every batch method into several chunks of two ids."""
    monkeypatch.setattr(crud_base, "BATCH_SIZE", 2)


class _SpyCRUDTag(SQLCRUDBase[TagORM, TagCreate, TagUpdate]):
    """Records which `_multi` methods the single-item methods call."""

    def __init__(self) -> None:
        super().__init__(TagORM)
        self.calls: list[str] = []

    def create_multi(
        self, db: Session, *, create_dtos: list[TagCreate]
    ) -> list[TagORM]:
        self.calls.append("create_multi")
        return super().create_multi(db=db, create_dtos=create_dtos)

    def update_multi(
        self, db: Session, *, ids: list[int], update_dtos: list[TagUpdate]
    ) -> list[TagORM]:
        self.calls.append("update_multi")
        return super().update_multi(db=db, ids=ids, update_dtos=update_dtos)

    def delete_multi(self, db: Session, *, ids: list[int]) -> int:
        self.calls.append("delete_multi")
        return super().delete_multi(db=db, ids=ids)


# --- create


def test_create_multi_returns_input_order(
    db_session: Session, project_with_tags: ProjectWithTags
) -> None:
    names = ["Zeta", "Alpha", "Mu"]
    created = crud_tag.create_multi(
        db=db_session,
        create_dtos=[
            TagCreate(
                name=name, color="#000000", project_id=project_with_tags["project"].id
            )
            for name in names
        ],
    )
    assert [tag.name for tag in created] == names


def test_create_multi_empty(db_session: Session) -> None:
    assert crud_tag.create_multi(db=db_session, create_dtos=[]) == []


# --- read


@pytest.mark.usefixtures("small_batches")
def test_read_by_ids_returns_input_order_across_batches(
    db_session: Session, project_with_tags: ProjectWithTags
) -> None:
    tags = project_with_tags["tags"]
    ids = [tags[i].id for i in SHUFFLED]

    result = crud_tag.read_by_ids(db=db_session, ids=ids)

    assert [tag.id for tag in result] == ids


@pytest.mark.usefixtures("small_batches")
def test_read_by_ids_repeats_duplicates(
    db_session: Session, project_with_tags: ProjectWithTags
) -> None:
    tags = project_with_tags["tags"]
    ids = [tags[2].id, tags[0].id, tags[2].id, tags[4].id, tags[0].id]

    result = crud_tag.read_by_ids(db=db_session, ids=ids)

    assert [tag.id for tag in result] == ids


def test_read_by_ids_raises_on_missing_id(
    db_session: Session, project_with_tags: ProjectWithTags
) -> None:
    tags = project_with_tags["tags"]
    missing_id = max(tag.id for tag in tags) + 1000

    with pytest.raises(NoSuchElementError):
        crud_tag.read_by_ids(db=db_session, ids=[tags[0].id, missing_id])


def test_read_by_ids_empty(db_session: Session) -> None:
    assert crud_tag.read_by_ids(db=db_session, ids=[]) == []


# --- update


@pytest.mark.usefixtures("small_batches")
def test_update_multi_returns_input_order_and_pairs_dtos(
    db_session: Session, project_with_tags: ProjectWithTags
) -> None:
    tags = project_with_tags["tags"]
    ids = [tags[i].id for i in SHUFFLED]

    result = crud_tag.update_multi(
        db=db_session,
        ids=ids,
        update_dtos=[TagUpdate(description=f"Description {i}") for i in SHUFFLED],
    )

    assert [tag.id for tag in result] == ids
    db_session.commit()
    db_session.expire_all()
    stored = crud_tag.read_by_ids(db=db_session, ids=[tag.id for tag in tags])
    assert [tag.description for tag in stored] == [f"Description {i}" for i in range(5)]
    assert [tag.name for tag in stored] == [f"Tag {i}" for i in range(5)]


def test_update_multi_rejects_duplicate_ids(
    db_session: Session, project_with_tags: ProjectWithTags
) -> None:
    tag_id = project_with_tags["tags"][0].id

    with pytest.raises(DuplicateIdsError):
        crud_tag.update_multi(
            db=db_session,
            ids=[tag_id, tag_id],
            update_dtos=[TagUpdate(name="A"), TagUpdate(name="B")],
        )


def test_update_multi_rejects_length_mismatch(
    db_session: Session, project_with_tags: ProjectWithTags
) -> None:
    tags = project_with_tags["tags"]

    with pytest.raises(ValueError):
        crud_tag.update_multi(
            db=db_session,
            ids=[tags[0].id, tags[1].id],
            update_dtos=[TagUpdate(name="A")],
        )


def test_update_multi_empty(db_session: Session) -> None:
    assert crud_tag.update_multi(db=db_session, ids=[], update_dtos=[]) == []


def test_update_reloads_relationship_of_changed_foreign_key(
    db_session: Session, project_with_tags: ProjectWithTags
) -> None:
    tags = project_with_tags["tags"]
    child = crud_tag.read(db=db_session, id=tags[1].id)
    assert child.parent is None  # loads the relationship before the update

    updated = crud_tag.update(
        db=db_session, id=child.id, update_dto=TagUpdate(parent_id=tags[0].id)
    )

    assert updated.parent is not None
    assert updated.parent.id == tags[0].id


# --- delete


@pytest.mark.usefixtures("small_batches")
def test_delete_multi_counts_and_ignores_duplicates_and_missing(
    db_session: Session, project_with_tags: ProjectWithTags
) -> None:
    tags = project_with_tags["tags"]
    missing_id = max(tag.id for tag in tags) + 1000
    ids = [tags[3].id, tags[0].id, tags[3].id, missing_id, tags[4].id]

    deleted = crud_tag.delete_multi(db=db_session, ids=ids)

    assert deleted == 3
    remaining = crud_tag.read_by_ids(db=db_session, ids=[tags[1].id, tags[2].id])
    assert [tag.name for tag in remaining] == ["Tag 1", "Tag 2"]
    assert not crud_tag.exists(db=db_session, id=tags[0].id)


def test_delete_multi_empty(db_session: Session) -> None:
    assert crud_tag.delete_multi(db=db_session, ids=[]) == 0


def test_delete_returns_the_deleted_object(
    db_session: Session, project_with_tags: ProjectWithTags
) -> None:
    tag_id = project_with_tags["tags"][2].id

    deleted = crud_tag.delete(db=db_session, id=tag_id)

    assert deleted.id == tag_id
    assert deleted.name == "Tag 2"
    assert not crud_tag.exists(db=db_session, id=tag_id)


# --- delegation


def test_single_methods_delegate_to_multi(
    db_session: Session, project_with_tags: ProjectWithTags
) -> None:
    spy = _SpyCRUDTag()

    created = spy.create(
        db=db_session,
        create_dto=TagCreate(
            name="Spy", color="#000000", project_id=project_with_tags["project"].id
        ),
    )
    updated = spy.update(db=db_session, id=created.id, update_dto=TagUpdate(name="X"))
    deleted = spy.delete(db=db_session, id=created.id)

    assert spy.calls == ["create_multi", "update_multi", "delete_multi"]
    assert updated.name == "X"
    assert deleted.id == created.id
