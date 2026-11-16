import pytest
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.doc.word_frequency_crud import crud_word_frequency
from feature_test_utils import SDOC_SENTENCES
from repos.ray.ray_repo import RayRepo

from .conftest import TextStepsProject, run_step_handler, spacy_output

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
# WORD FREQUENCY JOB (step text_word_frequency) TESTS
# ===========================================================================
# The step runs as a background job, so these tests call its handler, taken
# from the job registry by the step name. spaCy is an external service: the
# tests replace `RayRepo.spacy_pipline` with `spacy_output`.


def _run_word_frequency(project: TextStepsProject) -> None:
    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(
            RayRepo,
            "spacy_pipline",
            lambda self, spacy_input: spacy_output(spacy_input.text, {}),
        )
        run_step_handler(
            "text_word_frequency",
            {
                "project_id": project["project"].id,
                "sdoc_id": project["text"].id,
                "settings": SETTINGS,
                "text": TEXT,
                "language": "en",
            },
        )


def test_word_frequency_job_stores_the_counts_without_stopwords_and_punctuation(
    db_session: Session, text_steps_project: TextStepsProject
):
    """Of "Hello world. The cat sits on the mat.", the stopwords "The", "the",
    "on" and the dots are not counted; running the job twice stores each word
    once."""
    _run_word_frequency(text_steps_project)
    _run_word_frequency(text_steps_project)

    db_session.expire_all()
    stored = crud_word_frequency.read_by_project_and_doctype(
        db=db_session, project_id=text_steps_project["project"].id, doctype=DocType.text
    )
    sdoc_id = text_steps_project["text"].id
    assert sorted((wf.word, wf.count) for wf in stored if wf.sdoc_id == sdoc_id) == [
        ("Hello", 1),
        ("cat", 1),
        ("mat", 1),
        ("sits", 1),
        ("world", 1),
    ]
