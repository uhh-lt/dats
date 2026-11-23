from sqlalchemy.orm import Session

from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from feature_test_utils import SDOC_SENTENCES
from text_steps_test_utils import TextStepsProject, run_step_handler

TEXT = " ".join(SDOC_SENTENCES)
SETTINGS = {
    "extract_images": False,
    "pages_per_chunk": 10,
    "language": "en",
    "model": "default",
}

# ===========================================================================
# KEYWORDS JOB (step keywords) TESTS
# ===========================================================================
# The step runs as a background job, so these tests call its handler, taken
# from the job registry by the step name. The keywords come from YAKE, which
# runs in the job (no spaCy).


def test_keywords_job_stores_the_keywords_as_metadata(
    db_session: Session, text_steps_project: TextStepsProject
):
    """The job stores at most 5 keywords of at most two words (the constants of
    the step), each found in the text, as the document's metadata
    "keywords"."""
    sdoc_id = text_steps_project["text"].id

    run_step_handler(
        "keywords",
        {
            "project_id": text_steps_project["project"].id,
            "sdoc_id": sdoc_id,
            "settings": SETTINGS,
            "doctype": "text",
            "text": TEXT,
            "language": "en",
        },
    )

    db_session.expire_all()
    keywords = crud_sdoc_meta.read_by_sdoc_and_key(
        db=db_session, sdoc_id=sdoc_id, key="keywords"
    ).list_value
    assert keywords is not None
    assert 0 < len(keywords) <= 5
    assert all(len(keyword.split()) <= 2 for keyword in keywords), keywords
    assert all(keyword.lower() in TEXT.lower() for keyword in keywords), keywords
