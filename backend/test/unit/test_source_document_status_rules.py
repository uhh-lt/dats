import pytest

from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from common.sdoc_status_enum import SDocStatus, StepSetStatus
from core.doc.source_document_status_rules import (
    StepSetCounts,
    count_step_sets,
    document_status,
    step_set_status,
)

ERRONEOUS = SDocStatus.erroneous
PROCESSING = SDocStatus.processing
FINISHED = SDocStatus.finished

HTML = JobType.EXTRACT_HTML
LANG = JobType.TEXT_LANGUAGE_DETECTION
INDEX = JobType.TEXT_ES_INDEX


@pytest.mark.parametrize(
    "statuses,expected",
    [
        # a document without planned steps is finished
        pytest.param([], FINISHED, id="nothing-planned"),
        pytest.param([FINISHED, FINISHED], FINISHED, id="finished"),
        pytest.param([FINISHED, PROCESSING], PROCESSING, id="processing"),
        pytest.param([FINISHED, ERRONEOUS], ERRONEOUS, id="erroneous"),
        # erroneous wins over processing
        pytest.param([PROCESSING, ERRONEOUS], ERRONEOUS, id="mixed"),
    ],
)
def test_document_status_is_erroneous_else_processing_else_finished(
    statuses: list[SDocStatus], expected: SDocStatus
):
    """A document with an erroneous and a processing step is erroneous: it needs
    attention whatever else runs."""
    assert document_status(statuses) == expected


@pytest.mark.parametrize(
    "statuses,expected",
    [
        pytest.param({HTML: FINISHED, LANG: FINISHED}, StepSetStatus.ready, id="ready"),
        pytest.param(
            {HTML: FINISHED, LANG: PROCESSING},
            StepSetStatus.processing,
            id="processing",
        ),
        pytest.param(
            {HTML: FINISHED, LANG: ERRONEOUS}, StepSetStatus.failed, id="failed"
        ),
        # LANG has no row
        pytest.param({HTML: FINISHED}, StepSetStatus.not_planned, id="not-planned"),
        # processing wins over erroneous
        pytest.param(
            {HTML: ERRONEOUS, LANG: PROCESSING}, StepSetStatus.processing, id="mixed"
        ),
        # erroneous wins over not planned
        pytest.param({HTML: ERRONEOUS}, StepSetStatus.failed, id="failed-and-missing"),
        # an erroneous step outside the set does not count
        pytest.param(
            {HTML: FINISHED, LANG: FINISHED, INDEX: ERRONEOUS},
            StepSetStatus.ready,
            id="outside-the-set",
        ),
    ],
)
def test_step_set_status_is_processing_else_failed_else_not_planned_else_ready(
    statuses: dict[JobType, SDocStatus], expected: StepSetStatus
):
    """The status of the steps {HTML, LANG} of a document. With an erroneous and
    a processing step it is processing: a feature that still computes offers
    Restart, not Complete."""
    assert step_set_status([HTML, LANG], statuses) == expected


def test_count_step_sets_counts_each_document_once_per_set():
    """Text documents: 3 finished (HTML, LANG), 2 with LANG processing, 1 with
    LANG erroneous, 4 with only HTML; 7 images without steps. The set {HTML}
    is ready for all text documents; {HTML, LANG} counts each status, and LANG
    is missing. A doctype without documents counts zero."""
    combinations = [
        (DocType.text, {HTML: FINISHED, LANG: FINISHED}, 3),
        (DocType.text, {HTML: FINISHED, LANG: PROCESSING}, 2),
        (DocType.text, {HTML: FINISHED, LANG: ERRONEOUS}, 1),
        (DocType.text, {HTML: FINISHED}, 4),
        (DocType.image, {}, 7),
    ]
    both = frozenset({HTML, LANG})
    html = frozenset({HTML})

    counts = count_step_sets(
        combinations=combinations,
        step_sets={DocType.text: [both, html], DocType.audio: [html]},
    )

    assert counts == {
        DocType.text: {
            both: StepSetCounts(
                total=10,
                ready=3,
                processing=2,
                failed=1,
                not_planned=4,
                missing_steps={LANG},
            ),
            html: StepSetCounts(total=10, ready=10),
        },
        DocType.audio: {html: StepSetCounts()},
    }
