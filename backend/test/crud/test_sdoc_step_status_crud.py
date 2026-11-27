import pytest
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from systems.artefact_system.artefact_registry import artefact_registry
from systems.artefact_system.source_document_step_status_crud import (
    crud_sdoc_step_status,
)

from .conftest import StepStatusProject

FINISHED = SDocStatus.finished
PROCESSING = SDocStatus.processing
ERRONEOUS = SDocStatus.erroneous


def _read(db: Session, project_id: int, sdoc_id: int) -> dict[str, SDocStatus]:
    db.expire_all()
    return crud_sdoc_step_status.read_by_sdoc(
        db=db, project_id=project_id, sdoc_id=sdoc_id
    )


# ===========================================================================
# READ
# ===========================================================================


def test_read_by_sdocs_returns_the_planned_steps_in_input_order(
    db_session: Session, step_status_project: StepStatusProject
):
    """Every requested document is in the result, in the input order; a document
    without planned steps has an empty dict."""
    p = step_status_project
    ids = [p["image"].id, p["failed"].id]

    result = crud_sdoc_step_status.read_by_sdocs(
        db=db_session, project_id=p["project"].id, sdoc_ids=ids
    )

    assert list(result) == ids
    assert result[p["image"].id] == {}
    assert result[p["failed"].id] == {
        "html_extraction": FINISHED,
        "text_extraction": ERRONEOUS,
        "language_detection": PROCESSING,
    }


def test_count_by_project_groups_the_documents_by_step_status(
    db_session: Session, step_status_project: StepStatusProject
):
    """One entry per doctype and combination of step statuses of the project's
    documents; a document without planned steps has empty statuses."""
    p = step_status_project

    counts = crud_sdoc_step_status.count_by_project(
        db=db_session,
        project_id=p["project"].id,
        steps=sorted(artefact_registry.graph().all_steps()),
    )

    def key(status: dict[str, SDocStatus]) -> frozenset:
        return frozenset(status.items())

    text_status = {
        name: crud_sdoc_step_status.read_by_sdoc(
            db=db_session, project_id=p["project"].id, sdoc_id=p[name].id
        )
        for name in ("done", "running", "failed")
    }
    assert {(doctype, key(status)): count for doctype, status, count in counts} == {
        (DocType.image, frozenset()): 1,
        **{(DocType.text, key(status)): 1 for status in text_status.values()},
    }


def test_count_by_project_leaves_out_the_steps_not_counted(
    db_session: Session, step_status_project: StepStatusProject
):
    """Only the given steps are in the counted statuses: counting html_extraction
    alone puts the three text documents (each with a finished html_extraction) into
    one group."""
    p = step_status_project

    counts = crud_sdoc_step_status.count_by_project(
        db=db_session, project_id=p["project"].id, steps=["html_extraction"]
    )

    assert sorted(counts) == [
        (DocType.image, {}, 1),
        (DocType.text, {"html_extraction": FINISHED}, 3),
    ]


def test_count_by_project_rejects_more_steps_than_bits(
    db_session: Session, step_status_project: StepStatusProject
):
    """A step is one bit of a BIGINT: more than MAX_COUNTED_STEPS steps fail."""
    with pytest.raises(ValueError, match="at most 63"):
        crud_sdoc_step_status.count_by_project(
            db=db_session,
            project_id=step_status_project["project"].id,
            steps=["html_extraction"] * 64,
        )


# ===========================================================================
# UPDATE
# ===========================================================================


def test_update_status_plans_new_steps_and_overwrites_planned_ones(
    db_session: Session, step_status_project: StepStatusProject
):
    """Setting a status inserts the rows of steps that are not planned and
    replaces the status of planned ones; other steps keep theirs."""
    p = step_status_project

    crud_sdoc_step_status.update_status(
        db=db_session,
        project_id=p["project"].id,
        sdoc_ids=[p["running"].id, p["image"].id],
        steps=["tokens_sentences", "es_index"],
        status=FINISHED,
    )
    db_session.commit()

    assert _read(db_session, p["project"].id, p["running"].id) == {
        "html_extraction": FINISHED,
        "text_extraction": FINISHED,
        "language_detection": PROCESSING,
        "tokens_sentences": FINISHED,
        "es_index": FINISHED,
    }
    assert _read(db_session, p["project"].id, p["image"].id) == {
        "tokens_sentences": FINISHED,
        "es_index": FINISHED,
    }


def test_update_pending_to_erroneous_fails_only_processing_steps(
    db_session: Session, step_status_project: StepStatusProject
):
    """Of the given steps, the processing ones become erroneous; finished steps
    and steps that are not planned stay as they are."""
    p = step_status_project

    crud_sdoc_step_status.update_pending_to_erroneous(
        db=db_session,
        project_id=p["project"].id,
        sdoc_id=p["running"].id,
        steps=["text_extraction", "tokens_sentences", "named_entity_recognition"],
    )
    db_session.commit()

    assert _read(db_session, p["project"].id, p["running"].id) == {
        "html_extraction": FINISHED,
        "text_extraction": FINISHED,
        "language_detection": PROCESSING,
        "tokens_sentences": ERRONEOUS,
    }


# ===========================================================================
# DELETE
# ===========================================================================


def test_deleting_a_document_deletes_its_step_statuses(
    db_session: Session, step_status_project: StepStatusProject
):
    """The rows cascade with their document."""
    p = step_status_project
    sdoc_id = p["done"].id

    crud_sdoc.delete(db=db_session, project_id=p["project"].id, id=sdoc_id)
    db_session.commit()

    assert crud_sdoc_step_status.read_by_sdocs(
        db=db_session, project_id=p["project"].id, sdoc_ids=[sdoc_id]
    ) == {sdoc_id: {}}


# ===========================================================================
# OVERALL STATUS (crud_sdoc)
# ===========================================================================


def test_the_overall_status_is_derived_from_the_step_statuses(
    db_session: Session, step_status_project: StepStatusProject
):
    """The two forms of the document rule of `source_document_status_rules` agree
    (read_status, the status filters and the counts of crud_sdoc): a
    document is erroneous if a step is erroneous, else processing if a step is
    processing, else finished (also without planned steps)."""
    p = step_status_project
    project_id = p["project"].id
    expected = {
        SDocStatus.finished: {p["done"].id, p["image"].id},
        SDocStatus.processing: {p["running"].id},
        SDocStatus.erroneous: {p["failed"].id},
    }

    for status, sdoc_ids in expected.items():
        read = crud_sdoc.read_by_project_and_status(
            db=db_session, project_id=project_id, status=status
        )
        assert {s.id for s in read} == sdoc_ids, status
        assert crud_sdoc.count_by_project(
            db=db_session, project_id=project_id, status=status
        ) == len(sdoc_ids), status
        for sdoc_id in sdoc_ids:
            assert (
                crud_sdoc.read_status(
                    db=db_session, project_id=project_id, sdoc_id=sdoc_id
                )
                == status
            )
    finished = crud_sdoc.read_by_project(db=db_session, project_id=project_id)
    assert {s.id for s in finished} == expected[SDocStatus.finished]
