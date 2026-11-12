from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_step_status_crud import crud_sdoc_step_status

from .conftest import StepStatusProject

FINISHED = SDocStatus.finished
PROCESSING = SDocStatus.processing
ERRONEOUS = SDocStatus.erroneous


def _read(db: Session, sdoc_id: int) -> dict[JobType, SDocStatus]:
    db.expire_all()
    return crud_sdoc_step_status.read_by_sdoc(db=db, sdoc_id=sdoc_id)


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

    result = crud_sdoc_step_status.read_by_sdocs(db=db_session, sdoc_ids=ids)

    assert list(result) == ids
    assert result[p["image"].id] == {}
    assert result[p["failed"].id] == {
        JobType.EXTRACT_HTML: FINISHED,
        JobType.TEXT_EXTRACTION: ERRONEOUS,
        JobType.TEXT_LANGUAGE_DETECTION: PROCESSING,
    }


def test_read_sdoc_ids_to_plan_selects_missing_and_redo_steps(
    db_session: Session, step_status_project: StepStatusProject
):
    """A document is selected if one of the missing steps is not planned, or one
    of the redo steps has a redo status; documents of other projects and
    doctypes are never selected."""
    p = step_status_project

    missing = crud_sdoc_step_status.read_sdoc_ids_to_plan(
        db=db_session,
        project_id=p["project"].id,
        doctype=DocType.text,
        missing_steps=[JobType.TEXT_SPACY],
        redo_steps=[],
        redo_statuses=[],
    )
    redo = crud_sdoc_step_status.read_sdoc_ids_to_plan(
        db=db_session,
        project_id=p["project"].id,
        doctype=DocType.text,
        missing_steps=[],
        redo_steps=[JobType.TEXT_EXTRACTION],
        redo_statuses=[ERRONEOUS],
    )

    assert missing == [p["failed"].id]
    assert redo == [p["failed"].id]


def test_count_by_project_groups_the_documents_by_step_status(
    db_session: Session, step_status_project: StepStatusProject
):
    """One entry per doctype and combination of step statuses of the project's
    documents; a document without planned steps has empty statuses."""
    p = step_status_project

    counts = crud_sdoc_step_status.count_by_project(
        db=db_session, project_id=p["project"].id
    )

    def key(status: dict[JobType, SDocStatus]) -> frozenset:
        return frozenset(status.items())

    text_status = {
        name: crud_sdoc_step_status.read_by_sdoc(db=db_session, sdoc_id=p[name].id)
        for name in ("done", "running", "failed")
    }
    assert {(doctype, key(status)): count for doctype, status, count in counts} == {
        (DocType.image, frozenset()): 1,
        **{(DocType.text, key(status)): 1 for status in text_status.values()},
    }


def test_read_startable_returns_processing_rows_whose_inputs_are_finished(
    db_session: Session, step_status_project: StepStatusProject
):
    """Of the given rows, only processing ones whose input steps are all
    finished can start: the language detection of running (its text extraction
    is finished), not that of failed (erroneous input) or done (finished
    itself), nor spaCy of running (its language detection is processing)."""
    p = step_status_project

    startable = crud_sdoc_step_status.read_startable(
        db=db_session,
        rows={
            JobType.TEXT_LANGUAGE_DETECTION: [
                p["running"].id,
                p["failed"].id,
                p["done"].id,
            ],
            JobType.TEXT_SPACY: [p["running"].id],
        },
        inputs={
            JobType.TEXT_LANGUAGE_DETECTION: [JobType.TEXT_EXTRACTION],
            JobType.TEXT_SPACY: [JobType.TEXT_LANGUAGE_DETECTION],
        },
    )

    assert startable == {p["running"].id: [JobType.TEXT_LANGUAGE_DETECTION]}


# ===========================================================================
# CREATE
# ===========================================================================


def test_create_missing_plans_only_steps_without_a_row(
    db_session: Session, step_status_project: StepStatusProject
):
    """Planning spaCy and the index for running and image inserts a processing
    row where none exists and returns the inserted rows per step; the processing
    spaCy row of running stays as it is."""
    p = step_status_project

    planned = crud_sdoc_step_status.create_missing(
        db=db_session,
        sdoc_ids=[p["running"].id, p["image"].id],
        steps=[JobType.TEXT_SPACY, JobType.TEXT_ES_INDEX],
    )
    db_session.commit()

    assert planned == {
        JobType.TEXT_SPACY: [p["image"].id],
        JobType.TEXT_ES_INDEX: sorted([p["running"].id, p["image"].id]),
    }
    assert _read(db_session, p["image"].id) == {
        JobType.TEXT_SPACY: PROCESSING,
        JobType.TEXT_ES_INDEX: PROCESSING,
    }
    assert _read(db_session, p["running"].id)[JobType.TEXT_SPACY] == PROCESSING


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
        sdoc_ids=[p["running"].id, p["image"].id],
        steps=[JobType.TEXT_SPACY, JobType.TEXT_ES_INDEX],
        status=FINISHED,
    )
    db_session.commit()

    assert _read(db_session, p["running"].id) == {
        JobType.EXTRACT_HTML: FINISHED,
        JobType.TEXT_EXTRACTION: FINISHED,
        JobType.TEXT_LANGUAGE_DETECTION: PROCESSING,
        JobType.TEXT_SPACY: FINISHED,
        JobType.TEXT_ES_INDEX: FINISHED,
    }
    assert _read(db_session, p["image"].id) == {
        JobType.TEXT_SPACY: FINISHED,
        JobType.TEXT_ES_INDEX: FINISHED,
    }


def test_update_to_processing_plans_only_the_given_statuses_again(
    db_session: Session, step_status_project: StepStatusProject
):
    """The erroneous text extraction of failed becomes processing and is
    returned; the finished steps of done keep their status."""
    p = step_status_project

    changed = crud_sdoc_step_status.update_to_processing(
        db=db_session,
        sdoc_ids=[p["failed"].id, p["done"].id],
        steps=[JobType.TEXT_EXTRACTION, JobType.TEXT_SPACY],
        statuses=[ERRONEOUS],
    )
    db_session.commit()

    assert changed == {
        JobType.TEXT_EXTRACTION: [p["failed"].id],
        JobType.TEXT_SPACY: [],
    }
    assert _read(db_session, p["failed"].id)[JobType.TEXT_EXTRACTION] == PROCESSING
    assert _read(db_session, p["done"].id)[JobType.TEXT_SPACY] == FINISHED


def test_update_blocked_to_erroneous_fails_rows_with_an_erroneous_input(
    db_session: Session, step_status_project: StepStatusProject
):
    """The language detection of failed (input text extraction erroneous) and of
    other_project_doc (input not planned) become erroneous; the one of running
    (input finished) stays processing."""
    p = step_status_project

    crud_sdoc_step_status.update_blocked_to_erroneous(
        db=db_session,
        rows={
            JobType.TEXT_LANGUAGE_DETECTION: [
                p["failed"].id,
                p["other_project_doc"].id,
                p["running"].id,
            ]
        },
        inputs={JobType.TEXT_LANGUAGE_DETECTION: [JobType.TEXT_EXTRACTION]},
    )
    db_session.commit()

    step = JobType.TEXT_LANGUAGE_DETECTION
    assert _read(db_session, p["failed"].id)[step] == ERRONEOUS
    assert _read(db_session, p["other_project_doc"].id)[step] == ERRONEOUS
    assert _read(db_session, p["running"].id)[step] == PROCESSING


def test_update_blocked_to_erroneous_fails_the_steps_after_a_failed_one(
    db_session: Session, step_status_project: StepStatusProject
):
    """The rows are handled in their order: when the language detection of
    running fails (its given input, the index, is not planned), spaCy after it
    fails too, though it was processing behind a processing input before."""
    p = step_status_project

    crud_sdoc_step_status.update_blocked_to_erroneous(
        db=db_session,
        rows={
            JobType.TEXT_LANGUAGE_DETECTION: [p["running"].id],
            JobType.TEXT_SPACY: [p["running"].id],
        },
        inputs={
            JobType.TEXT_LANGUAGE_DETECTION: [JobType.TEXT_ES_INDEX],
            JobType.TEXT_SPACY: [JobType.TEXT_LANGUAGE_DETECTION],
        },
    )
    db_session.commit()

    status = _read(db_session, p["running"].id)
    assert status[JobType.TEXT_LANGUAGE_DETECTION] == ERRONEOUS
    assert status[JobType.TEXT_SPACY] == ERRONEOUS


def test_update_pending_to_erroneous_fails_only_processing_steps(
    db_session: Session, step_status_project: StepStatusProject
):
    """Of the given steps, the processing ones become erroneous; finished steps
    and steps that are not planned stay as they are."""
    p = step_status_project

    crud_sdoc_step_status.update_pending_to_erroneous(
        db=db_session,
        sdoc_id=p["running"].id,
        steps=[JobType.TEXT_EXTRACTION, JobType.TEXT_SPACY, JobType.TEXT_NER],
    )
    db_session.commit()

    assert _read(db_session, p["running"].id) == {
        JobType.EXTRACT_HTML: FINISHED,
        JobType.TEXT_EXTRACTION: FINISHED,
        JobType.TEXT_LANGUAGE_DETECTION: PROCESSING,
        JobType.TEXT_SPACY: ERRONEOUS,
    }


# ===========================================================================
# DELETE
# ===========================================================================


def test_delete_pending_by_project_unplans_only_processing_steps(
    db_session: Session, step_status_project: StepStatusProject
):
    """The processing rows of the given steps of the project's documents of the
    doctype are deleted (not planned); other statuses, other steps and other
    projects keep their rows."""
    p = step_status_project

    deleted = crud_sdoc_step_status.delete_pending_by_project(
        db=db_session,
        project_id=p["project"].id,
        doctype=DocType.text,
        steps=[JobType.TEXT_LANGUAGE_DETECTION, JobType.TEXT_EXTRACTION],
    )
    db_session.commit()

    assert deleted == 2
    assert JobType.TEXT_LANGUAGE_DETECTION not in _read(db_session, p["running"].id)
    assert _read(db_session, p["failed"].id) == {
        JobType.EXTRACT_HTML: FINISHED,
        JobType.TEXT_EXTRACTION: ERRONEOUS,
    }
    other = _read(db_session, p["other_project_doc"].id)
    assert other[JobType.TEXT_LANGUAGE_DETECTION] == PROCESSING


def test_deleting_a_document_deletes_its_step_statuses(
    db_session: Session, step_status_project: StepStatusProject
):
    """The rows cascade with their document."""
    p = step_status_project
    sdoc_id = p["done"].id

    crud_sdoc.delete(db=db_session, id=sdoc_id)
    db_session.commit()

    assert crud_sdoc_step_status.read_by_sdocs(db=db_session, sdoc_ids=[sdoc_id]) == {
        sdoc_id: {}
    }


# ===========================================================================
# OVERALL STATUS (crud_sdoc)
# ===========================================================================


def test_the_overall_status_is_derived_from_the_step_statuses(
    db_session: Session, step_status_project: StepStatusProject
):
    """read_status, the status filters and the counts of crud_sdoc agree: a
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
        assert crud_sdoc.count_by_project_and_status(
            db=db_session, project_id=project_id, status=status
        ) == len(sdoc_ids), status
        for sdoc_id in sdoc_ids:
            assert crud_sdoc.read_status(db=db_session, sdoc_id=sdoc_id) == status
    finished = crud_sdoc.read_by_project(db=db_session, project_id=project_id)
    assert {s.id for s in finished} == expected[SDocStatus.finished]
