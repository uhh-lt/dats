"""The step quotation_detection, with the quotation model of Ray replaced."""

from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from common.languages_enum import Language
from common.sdoc_status_enum import SDocStatus
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_group_service import SpanGroupService
from core.code.code_crud import crud_code
from core.doc.source_document_orm import SourceDocumentORM
from core.user.user_crud import SYSTEM_USER_ID
from job_test_utils import HeldJobs
from modules.quotation_detection import quotation_detection_job
from pipeline_test_utils import read_step_status
from repos.ray.dto.quote import QuoteJobOutput, QuoteOutputDoc, QuoteTuple
from systems.artefact_system.artefact_dto import ProcessingSettings
from systems.artefact_system.step_run import start_steps

from .conftest import QuotationProject

STEP = "quotation_detection"

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=10,
    keyword_number=5,
    keyword_deduplication_threshold=0.5,
    keyword_max_ngram_size=2,
    language=Language.german,
    model="default",
)


def _quote(
    typ: str,
    *,
    quote: list[tuple[int, int]],
    speaker: list[tuple[int, int]] | None = None,
    cue: list[tuple[int, int]] | None = None,
    addressee: list[tuple[int, int]] | None = None,
    frame: list[tuple[int, int]] | None = None,
) -> QuoteTuple:
    return QuoteTuple(
        typ=typ,
        quote=quote,
        speaker=speaker or [],
        cue=cue or [],
        addressee=addressee or [],
        frame=frame or [],
    )


def _output(sdoc: SourceDocumentORM, quotes: list[QuoteTuple]) -> QuoteJobOutput:
    """What the quotation model answers for the document."""
    return QuoteJobOutput(
        id=sdoc.id,
        project_id=sdoc.project_id,
        documents=[QuoteOutputDoc(id=sdoc.id, quotes=quotes)],
        info=[],
    )


def _run(held_jobs: HeldJobs, sdoc: SourceDocumentORM, output: QuoteJobOutput | None):
    """Start the step for the document and run its job with the quotation model
    answering `output`; returns the mock of the model call."""
    with patch.object(
        quotation_detection_job.ray, "quote_prediction", return_value=output
    ) as prediction:
        start_steps(
            project_id=sdoc.project_id, sdoc_id=sdoc.id, steps=[STEP], settings=SETTINGS
        )
        held_jobs.run(STEP)
    return prediction


def _groups(db: Session, sdoc: SourceDocumentORM) -> list[list[tuple[str, str]]]:
    """The span groups of the system user in the document: per group its spans
    as (code name, text), ordered by span id."""
    db.expire_all()
    return [
        [
            (crud_code.read(db=db, id=span.code_id).name, span.text)
            for span in group.span_annotations
        ]
        for group in SpanGroupService().read_with_annotations_by_user_and_sdoc(
            db=db, user_id=SYSTEM_USER_ID, sdoc_id=sdoc.id
        )
        if group.name == "quote"
    ]


def _span_count(db: Session, sdoc: SourceDocumentORM) -> int:
    """The number of span annotations of the system user in the document."""
    db.expire_all()
    return len(
        crud_span_anno.read_by_user_and_sdoc(
            db=db, user_id=SYSTEM_USER_ID, sdoc_id=sdoc.id
        )
    )


def test_quotation_detection_annotates_each_quote_as_one_span_group(
    db_session: Session, quotation_project: QuotationProject, held_jobs: HeldJobs
) -> None:
    """The step sends the German text document to the quotation model once,
    with its tokens and sentences, and stores each quote as one span group
    "quote" of the system user with its parts as span annotations; the step
    finishes."""
    german = quotation_project["german"]
    output = _output(
        german,
        [
            _quote(
                "Direct",
                quote=[(2, 5)],
                speaker=[(0, 1)],
                cue=[(1, 2)],
                frame=[(0, 2)],
            ),
            _quote("Reported", quote=[(5, 9)], addressee=[(5, 7)]),
        ],
    )

    prediction = _run(held_jobs, german, output)

    prediction.assert_called_once()
    (model_input,) = prediction.call_args.args
    (document,) = model_input.documents
    assert document.id == german.id
    assert [token.text for token in document.tokens][:3] == ["Anna", "sagte,", "sie"]
    assert [sentence.text for sentence in document.sentences] == [
        "Anna sagte, sie komme morgen.",
        "Das Wetter bleibt schön.",
    ]
    assert _groups(db_session, german) == [
        [
            ("DIRECT", "sie komme morgen."),
            ("FRAME", "Anna sagte,"),
            ("CUE", "sagte,"),
            ("SPEAKER", "Anna"),
        ],
        [
            ("REPORTED", "Das Wetter bleibt schön."),
            ("ADDRESSEE", "Das Wetter"),
        ],
    ]
    assert read_step_status(db_session, german.id, STEP) == SDocStatus.finished


@pytest.mark.parametrize(
    "typ,code",
    [
        # the five quote types of the model map to the children of QUOTE
        pytest.param("Direct", "DIRECT", id="direct"),
        pytest.param("Indirect", "INDIRECT", id="indirect"),
        pytest.param("Reported", "REPORTED", id="reported"),
        pytest.param("FreeIndirect", "FREE_INDIRECT", id="free-indirect"),
        pytest.param(
            "IndirectFreeIndirect", "INDIRECT_FREE_INDIRECT", id="indirect-free"
        ),
        # an unknown type falls back to QUOTE itself
        pytest.param("Unknown", "QUOTE", id="fallback"),
    ],
)
def test_quotation_detection_codes_the_quote_by_its_type(
    db_session: Session,
    quotation_project: QuotationProject,
    held_jobs: HeldJobs,
    typ: str,
    code: str,
) -> None:
    """The quote span gets the code of the quote type the model names."""
    german = quotation_project["german"]

    _run(held_jobs, german, _output(german, [_quote(typ, quote=[(0, 1)])]))

    assert _groups(db_session, german) == [[(code, "Anna")]]


def test_quotation_detection_replaces_the_quotations_of_an_earlier_run(
    db_session: Session, quotation_project: QuotationProject, held_jobs: HeldJobs
) -> None:
    """A second run leaves exactly the span groups and spans of its own result:
    the quotes of the first run are gone, no empty group remains."""
    german = quotation_project["german"]
    _run(
        held_jobs,
        german,
        _output(
            german,
            [
                _quote("Direct", quote=[(2, 5)], speaker=[(0, 1)]),
                _quote("Reported", quote=[(5, 9)]),
            ],
        ),
    )

    _run(held_jobs, german, _output(german, [_quote("Indirect", quote=[(3, 4)])]))

    assert _groups(db_session, german) == [[("INDIRECT", "komme")]]
    assert _span_count(db_session, german) == 1


@pytest.mark.parametrize(
    "document",
    [
        # a text document in another language than German
        pytest.param("english", id="not-german"),
        # a German image whose caption has no sentences
        pytest.param("german_image", id="image-without-sentences"),
        # a German audio document with a sentence boundary inside a token
        pytest.param("german_audio", id="audio-with-split-token"),
    ],
)
def test_quotation_detection_skips_documents_the_model_does_not_handle(
    db_session: Session,
    quotation_project: QuotationProject,
    held_jobs: HeldJobs,
    document: str,
) -> None:
    """For a document that is no German text document, the step finishes
    without reading its token data and without calling the quotation model,
    and the document has no quotations."""
    sdoc = {
        "english": quotation_project["english"],
        "german_image": quotation_project["german_image"],
        "german_audio": quotation_project["german_audio"],
    }[document]

    prediction: MagicMock = _run(held_jobs, sdoc, None)

    prediction.assert_not_called()
    assert _groups(db_session, sdoc) == []
    assert read_step_status(db_session, sdoc.id, STEP) == SDocStatus.finished


def test_quotation_detection_removes_the_quotations_of_a_document_no_longer_german(
    db_session: Session, quotation_project: QuotationProject, held_jobs: HeldJobs
) -> None:
    """A document whose language changed from German keeps no quotations of an
    earlier run: the step removes its span group and span annotation without
    calling the quotation model."""
    was_german = quotation_project["was_german"]

    prediction: MagicMock = _run(held_jobs, was_german, None)

    prediction.assert_not_called()
    assert _groups(db_session, was_german) == []
    assert _span_count(db_session, was_german) == 0
    assert read_step_status(db_session, was_german.id, STEP) == SDocStatus.finished
