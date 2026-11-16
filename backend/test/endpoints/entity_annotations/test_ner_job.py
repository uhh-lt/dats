import pytest
from sqlalchemy.orm import Session

from core.annotation.span_annotation_crud import crud_span_anno
from core.code.code_crud import crud_code
from core.user.user_crud import SYSTEM_USER_ID
from feature_test_utils import SDOC_SENTENCES
from repos.ray.ray_repo import RayRepo
from text_steps_test_utils import TextStepsProject, run_step_handler, spacy_output

TEXT = " ".join(SDOC_SENTENCES)
SETTINGS = {
    "extract_images": False,
    "pages_per_chunk": 10,
    "keyword_number": 5,
    "keyword_deduplication_threshold": 0.5,
    "keyword_max_ngram_size": 2,
    "language": "en",
    "model": "default",
}

# ===========================================================================
# NAMED ENTITY JOB (step text_ner) TESTS
# ===========================================================================
# The step runs as a background job, so these tests call its handler, taken
# from the job registry by the step name. spaCy is an external service: the
# tests replace `RayRepo.spacy_pipline` with `spacy_output`.


def _run_ner(project: TextStepsProject, entities: dict[str, str]) -> None:
    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(
            RayRepo,
            "spacy_pipline",
            lambda self, spacy_input: spacy_output(spacy_input.text, entities),
        )
        run_step_handler(
            "text_ner",
            {
                "project_id": project["project"].id,
                "sdoc_id": project["text"].id,
                "settings": SETTINGS,
                "text": TEXT,
                "language": "en",
            },
        )


def _system_spans(db: Session, sdoc_id: int) -> list[tuple[str, str]]:
    """The spans of the system user: text and code name."""
    db.expire_all()
    spans = crud_span_anno.read_by_user_and_sdoc(
        db=db, user_id=SYSTEM_USER_ID, sdoc_id=sdoc_id
    )
    return sorted(
        (s.span_text.text, crud_code.read(db=db, id=s.code_id).name) for s in spans
    )


def test_ner_job_stores_the_entities_as_spans_of_the_system_user(
    db_session: Session, text_steps_project: TextStepsProject
):
    """spaCy finds "world" (ORG) and "cat" (PERSON): the job stores both as
    spans of the system user with their system codes."""
    _run_ner(text_steps_project, {"world": "ORG", "cat": "PERSON"})

    assert _system_spans(db_session, text_steps_project["text"].id) == [
        ("cat", "PERSON"),
        ("world", "ORG"),
    ]


def test_ner_job_replaces_the_entities_of_an_earlier_run(
    db_session: Session, text_steps_project: TextStepsProject
):
    """A second run (a recompute) replaces the system user's entities of the
    first: the German label PER is stored as PERSON."""
    _run_ner(text_steps_project, {"world": "ORG"})
    _run_ner(text_steps_project, {"mat": "PER"})

    assert _system_spans(db_session, text_steps_project["text"].id) == [
        ("mat", "PERSON")
    ]
