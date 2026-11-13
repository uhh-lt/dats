from unittest.mock import patch

from sqlalchemy.orm import Session

from common.languages_enum import Language
from common.sdoc_status_enum import SDocStatus
from feature_test_utils import FeatureProject
from job_test_utils import HeldJobs
from modules.doc_processing.html import spacy_job
from pipeline_test_utils import read_step_status
from systems.artefact_system.artefact_dto import ProcessingSettings
from systems.artefact_system.step_run import start_steps
from systems.job_system.job_system_enum import JobStatus

SETTINGS = ProcessingSettings(
    extract_images=True,
    pages_per_chunk=10,
    keyword_number=5,
    keyword_deduplication_threshold=0.5,
    keyword_max_ngram_size=2,
    language=Language.english,
    model="default",
)

# ===========================================================================
# A JOB THAT COMPUTES SEVERAL STEPS (spacy_job.py)
# ===========================================================================


def test_spacy_job_fails_on_a_further_step_it_does_not_compute(
    db_session: Session, ner_pending_project: FeatureProject, held_jobs: HeldJobs
) -> None:
    """Asked for text_ner while its handler has no branch for it (as for a step
    newly added to the job's `further_steps`), the spaCy job fails with a message
    naming the step before it calls spaCy, and text_ner becomes erroneous instead
    of finished."""
    sdoc_id = ner_pending_project["text_done"].id
    writers = {
        step: writer
        for step, writer in spacy_job._STEP_WRITERS.items()
        if step != "text_ner"
    }

    with (
        patch.dict(spacy_job._STEP_WRITERS, writers, clear=True),
        patch.object(spacy_job.ray, "spacy_pipline") as spacy,
    ):
        start_steps(
            project_id=ner_pending_project["project"].id,
            sdoc_id=sdoc_id,
            steps=["text_ner"],
            settings=SETTINGS,
        )
        held_jobs.run("text_spacy")

    (job,) = held_jobs.ran("text_spacy")
    assert job.get_status() == JobStatus.FAILED
    result = job.job.latest_result()
    assert result is not None and "'text_ner'" in str(result.exc_string)
    spacy.assert_not_called()
    db_session.expire_all()
    assert read_step_status(db_session, sdoc_id, "text_ner") == (SDocStatus.erroneous)
