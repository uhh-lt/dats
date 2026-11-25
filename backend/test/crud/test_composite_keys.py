from collections.abc import Callable

import pytest
from psycopg2.errors import ForeignKeyViolation
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from composite_keys_test_utils import TwoTenants
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_group_crud import crud_span_group
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import MemoCreateIntern
from core.memo.memo_enum import AttachedObjectType
from core.tag.tag_crud import crud_tag
from modules.classifier.classifier_crud import crud_classifier
from repos.db.orm_base import ORMBase
from repos.db.sql_exceptions import NoSuchElementError

# (row, relationship, target): every relationship over a composite foreign key,
# named by the keys of TenantRows; a target never holds a row with the same unique
# key yet (e.g. the bare document), so only the foreign key can reject it
RELATIONSHIPS = [
    ("sdoc", "folder", "folder"),
    ("child_folder", "parent", "folder"),
    ("child_code", "parent", "code"),
    ("child_tag", "parent", "tag"),
    ("sdoc_data", "source_document", "bare_sdoc"),
    ("sdoc_metadata", "source_document", "sdoc"),
    ("sdoc_metadata", "project_metadata", "project_metadata"),
    ("word_frequency", "source_document", "bare_sdoc"),
    ("step_status", "source_document", "bare_sdoc"),
    ("adoc", "source_document", "bare_sdoc"),
    ("span", "code", "code"),
    ("span", "annotation_document", "adoc"),
    ("sentence", "code", "code"),
    ("sentence", "annotation_document", "adoc"),
    ("bbox", "code", "code"),
    ("bbox", "annotation_document", "adoc"),
    ("span_group", "annotation_document", "adoc"),
    ("handle", "code", "child_code"),
    ("memo", "attached_to", "handle"),
    ("memo_recent", "memo", "bare_memo"),
    ("prompt_version", "prompt", "bare_prompt"),
    ("experiment_run", "experiment", "experiment"),
    ("classifier_evaluation", "classifier", "classifier"),
    ("aspect", "tag", "tag"),
    ("cluster", "aspect", "aspect"),
    ("child_cluster", "parent_cluster", "cluster"),
    ("document_aspect", "source_document", "sdoc"),
    ("document_aspect", "aspect", "aspect"),
    ("document_cluster", "source_document", "sdoc"),
    ("document_cluster", "cluster", "cluster"),
    ("tag_recommendation", "source_document", "sdoc"),
    ("tag_recommendation", "predicted_tag", "tag"),
]


def _assert_foreign_key_violation(db: Session, write: Callable[[], object]) -> None:
    with pytest.raises(IntegrityError) as error:
        write()
        db.flush()
    db.rollback()
    assert isinstance(error.value.orig, ForeignKeyViolation), error.value


# ===========================================================================
# RELATIONSHIPS OVER COMPOSITE FOREIGN KEYS
# ===========================================================================


def test_relationships_never_write_the_project_id():
    """No relationship copies a project_id: the only writers of a project_id
    column are the relationships onto the project itself, so assigning an object
    of another project cannot move a row into that project."""
    writers = [
        f"{mapper.class_.__name__}.{relationship.key}"
        for mapper in ORMBase.registry.mappers
        for relationship in mapper.relationships
        if not relationship.viewonly
        for source, target in [
            *relationship.synchronize_pairs,
            *(relationship.secondary_synchronize_pairs or []),
        ]
        if target.name == "project_id" and source.table.name != "project"
    ]

    assert writers == []


@pytest.mark.parametrize(
    "row_key,relationship,target_key",
    [
        pytest.param(row, relationship, target, id=f"{row}.{relationship}")
        for row, relationship, target in RELATIONSHIPS
    ],
)
def test_cross_project_assignment_fails(
    db_session: Session,
    two_tenants: TwoTenants,
    row_key: str,
    relationship: str,
    target_key: str,
):
    """Assigning the object of another project to a relationship writes only its
    id column, so the composite foreign key rejects the row."""
    row = two_tenants["own"][row_key]
    target = two_tenants["foreign"][target_key]

    _assert_foreign_key_violation(
        db_session, lambda: setattr(row, relationship, target)
    )


# ===========================================================================
# LINKS AND ATTACHMENTS ACROSS PROJECTS
# ===========================================================================


def test_tag_link_to_a_document_of_another_project_fails(
    db_session: Session, two_tenants: TwoTenants
):
    """The link belongs to the project of the document, so a tag of another
    project violates its foreign key."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]

    _assert_foreign_key_violation(
        db_session,
        lambda: crud_tag.link_multiple_tags(
            db=db_session,
            project_id=own["project"].id,
            sdoc_ids=[own["sdoc"].id],
            tag_ids=[foreign["tag"].id],
        ),
    )


@pytest.mark.parametrize(
    "link",
    [
        # the code and tag links belong to the project of the classifier
        pytest.param("codes", id="code"),
        pytest.param("tags", id="tag"),
    ],
)
def test_classifier_link_to_another_project_fails(
    db_session: Session, two_tenants: TwoTenants, link: str
):
    """A classifier links only codes and tags of its own project."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]
    classifier_id = own["classifier"].id

    _assert_foreign_key_violation(
        db_session,
        lambda: (
            crud_classifier.link_codes(
                db=db_session, id=classifier_id, code_ids=[foreign["code"].id]
            )
            if link == "codes"
            else crud_classifier.link_tags(
                db=db_session, id=classifier_id, tag_ids=[foreign["tag"].id]
            )
        ),
    )


def test_span_annotation_joins_no_span_group_of_another_project(
    db_session: Session, two_tenants: TwoTenants
):
    """add_to_span_group reads the span group within the project of the span
    annotation, so a span group of another project is not found."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]

    with pytest.raises(NoSuchElementError):
        crud_span_anno.add_to_span_group(
            db=db_session,
            project_id=own["project"].id,
            span_id=own["span"].id,
            group_id=foreign["span_group"].id,
        )


def test_span_group_links_no_span_annotation_of_another_project(
    db_session: Session, two_tenants: TwoTenants
):
    """link_groups_spans_batch writes the links in the project it is given, so the
    composite foreign key of the link rejects a span annotation of another
    project."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]

    _assert_foreign_key_violation(
        db_session,
        lambda: crud_span_group.link_groups_spans_batch(
            db=db_session,
            project_id=own["project"].id,
            links={own["span_group"].id: [foreign["span"].id]},
        ),
    )


def test_memo_attaches_to_no_object_of_another_project(
    db_session: Session, two_tenants: TwoTenants, test_user
):
    """The object handle of a memo belongs to the project of the memo, so an
    object of another project violates the handle's foreign key."""
    own, foreign = two_tenants["own"], two_tenants["foreign"]

    _assert_foreign_key_violation(
        db_session,
        lambda: crud_memo.create_for_attached_object(
            db=db_session,
            project_id=own["project"].id,
            attached_object_id=foreign["child_code"].id,
            attached_object_type=AttachedObjectType.code,
            create_dto=MemoCreateIntern(
                title="Cross-project memo",
                content="",
                content_json="",
                user_id=test_user.id,
                uuid="cross-project-memo",
            ),
        ),
    )
