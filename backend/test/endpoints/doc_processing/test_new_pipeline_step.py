import zipfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.languages_enum import Language
from common.sdoc_status_enum import SDocStatus
from core.doc.source_document_crud import crud_sdoc
from core.doc_processing.doc_processing_dto import SdocHealthResult, SdocInitJobInput
from core.doc_processing.entrypoints.init_sdoc_job import SDOC_INIT_JOB
from feature_test_utils import FeatureProject
from job_test_utils import HeldJobs
from modules.eximport.project.export_project import export_project
from modules.eximport.project.import_project import import_project
from pipeline_test_utils import artefact_named, read_step_status, started_steps
from repos.filesystem_repo import FilesystemRepo
from systems.artefact_system.artefact_computation_job import ARTEFACT_COMPUTATION_JOB
from systems.artefact_system.artefact_dto import (
    ProcessingSettings,
    SdocProcessingJobInput,
)
from systems.artefact_system.pipeline_step_decorator import pipeline_step
from systems.feature_system.feature_dto import FeatureActivation
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_service import JobService

from .conftest import (
    DUMMY_UPLOAD_TEXT,
    DummyJobInput,
    DummyStep,
    DummyStepProjects,
    PairedSteps,
)

SETTINGS = ProcessingSettings(
    extract_images=False,
    pages_per_chunk=10,
    language=Language.english,
    model="default",
)

# ===========================================================================
# A NEW PIPELINE STEP, DECLARED ONCE
# ===========================================================================
# The jobs are held (`held_jobs`), and the tests run them in-process through the
# real job handler and its hooks, as the worker does.


def test_a_step_declared_once_is_planned_run_shown_exported_and_imported(
    client: TestClient,
    db_session: Session,
    dummy_step: DummyStep,
    dummy_step_projects: DummyStepProjects,
    held_jobs: HeldJobs,
):
    """The step of `dummy_step` has only its declaration. An upload plans it; when
    text_extraction finishes, the advancing starts it, and its enricher
    completes its input with the stored content; it finishes, the health view
    shows it, and a project export and import keep its status."""
    step = dummy_step["step"]
    p = dummy_step_projects

    # planned at upload
    JobService().start_job(
        SDOC_INIT_JOB,
        SdocInitJobInput(
            project_id=p["project"].id,
            filepath=p["upload"],
            doctype=DocType.text,
            folder_id=None,
            settings=SETTINGS,
        ),
    )
    held_jobs.run(SDOC_INIT_JOB)
    (html_extraction,) = held_jobs.inputs("html_extraction")
    assert isinstance(html_extraction, SdocProcessingJobInput)
    sdoc_id = html_extraction.sdoc_id
    assert read_step_status(db_session, sdoc_id, step) == SDocStatus.processing

    # started after its input step, its input completed by its enricher
    held_jobs.run("html_extraction")
    assert held_jobs.inputs(step) == []
    held_jobs.run("text_extraction")
    (payload,) = held_jobs.inputs(step)
    assert isinstance(payload, DummyJobInput)
    assert payload.settings == SETTINGS
    assert payload.text == DUMMY_UPLOAD_TEXT

    # run and set finished
    held_jobs.run(step)
    assert dummy_step["computed"] == {sdoc_id: DUMMY_UPLOAD_TEXT}
    assert read_step_status(db_session, sdoc_id, step) == SDocStatus.finished

    # shown by the health view
    response = client.post(
        f"/docprocessing/project/{p['project'].id}/search",
        params={"doctype": DocType.text.value, "page": 0, "page_size": 10},
        json=[],
    )
    assert response.status_code == 200, response.text
    rows = SdocHealthResult.model_validate(response.json()).data
    assert [row.status[step] for row in rows] == [SDocStatus.finished]

    # exported and imported
    fsr = FilesystemRepo()
    archive = export_project(db=db_session, fsr=fsr, project_id=p["project"].id)
    import_dir = fsr.create_temp_dir("dummy_step_eximport")
    with zipfile.ZipFile(archive) as zip_file:
        zip_file.extractall(import_dir)
    import_project(
        db=db_session,
        fsr=fsr,
        path_to_dir=import_dir,
        project_id=p["target_project"].id,
    )
    db_session.commit()
    imported = crud_sdoc.read_by_project(
        db=db_session, project_id=p["target_project"].id, only_finished=False
    )
    assert len(imported) == 1
    assert read_step_status(db_session, imported[0].id, step) == SDocStatus.finished


def test_a_step_requiring_two_artefacts_of_one_step_is_planned_and_started(
    client: TestClient,
    db_session: Session,
    paired_steps: PairedSteps,
    feature_project: FeatureProject,
    held_jobs: HeldJobs,
):
    """Enabling a feature plans the two new core steps of `paired_steps` for
    text_running, whose text extraction is finished: the computation starts the
    producer, the consumer waits for it (it is not failed for counting its one
    input step twice) and starts once the producer finishes."""
    p = feature_project
    producer = paired_steps["producer"]
    consumer = paired_steps["consumer"]
    sdoc_id = p["text_running"].id

    response = client.post(
        f"/feature/project/{p['project'].id}/keyword_statistics/enable",
        json=FeatureActivation(settings=SETTINGS).model_dump(mode="json"),
    )

    assert response.status_code == 200, response.text
    held_jobs.run(ARTEFACT_COMPUTATION_JOB)
    started = started_steps(held_jobs)
    assert producer in started[sdoc_id]
    assert consumer not in started[sdoc_id]
    assert read_step_status(db_session, sdoc_id, consumer) == SDocStatus.processing

    held_jobs.run(producer, consumer)

    assert paired_steps["ran"][producer].count(sdoc_id) == 1
    assert paired_steps["ran"][consumer].count(sdoc_id) == 1
    assert read_step_status(db_session, sdoc_id, consumer) == SDocStatus.finished


def test_a_step_without_an_enricher_is_rejected(unregistered_job_type: str):
    """A pipeline step is started with a bare input, so registering one without
    an enricher fails."""

    def handle(payload: SdocProcessingJobInput, job: Job) -> None:
        pass

    with pytest.raises(ValueError, match="has no enricher"):
        pipeline_step(
            requires={artefact_named("content")},
            produces=set(),
            doctypes={DocType.text},
        )(
            register_job(
                job_type=unregistered_job_type,
                input_type=SdocProcessingJobInput,
            )(handle)
        )
