import os
import sys
import wave
from enum import Enum
from pathlib import Path
from typing import Generator, TypedDict, TypeVar
from unittest.mock import patch

import pytest
from sqlalchemy.orm import Session

from common import artefact_enum
from common.artefact_enum import Artefact
from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from feature_test_utils import (
    FeatureProject,
    create_feature_project,
    create_project_with_features,
)
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job, JobInputBase
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_service import JobService
from systems.job_system.pipeline_graph import pipeline_registry


class AudioProject(TypedDict):
    """This fixture sets up the following project:

    - Project "Simple Test Project" of the test user (see `test_project`).
    - One audio document "Test Audio" (`silence.wav`): one second of silence
      (16 kHz, mono, 16 bit PCM), stored in the project's filesystem directory.
      The document is in the state right after its upload: its document data
      exists but is empty (no content, no tokens, no token timings), so the
      transcription is the step that fills it.

    Non-obvious derived behavior:

    - The file contains no speech, so tests of the transcription step replace
      the Whisper call (`RayRepo.whisper_transcribe`) and assert on its output.
    """

    project: ProjectORM
    audio_document: SourceDocumentORM
    audio_filepath: str


@pytest.fixture(scope="function")
def audio_project(db_session: Session, test_project: ProjectORM) -> AudioProject:
    from core.doc.source_document_crud import crud_sdoc
    from core.doc.source_document_data_crud import crud_sdoc_data
    from core.doc.source_document_data_dto import SourceDocumentDataCreate
    from core.doc.source_document_dto import SourceDocumentCreate
    from repos.filesystem_repo import FilesystemRepo

    fsr = FilesystemRepo()
    sdoc = crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename="silence.wav",
            name="Test Audio",
            doctype=DocType.audio,
            project_id=test_project.id,
            folder_id=None,
        ),
    )

    file_path = fsr._get_dst_path_for_project_sdoc_file(
        project_id=test_project.id, filename=sdoc.filename
    )
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(file_path), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(16000)
        f.writeframes(b"\x00\x00" * 16000)

    crud_sdoc_data.create(
        db=db_session,
        create_dto=SourceDocumentDataCreate(
            id=sdoc.id,
            content="",
            repo_url=os.path.relpath(file_path, fsr.root_dir),
            raw_html="",
            html="",
            token_starts=[],
            token_ends=[],
            sentence_starts=[],
            sentence_ends=[],
            token_time_starts=None,
            token_time_ends=None,
        ),
    )

    db_session.commit()
    db_session.refresh(test_project)
    db_session.refresh(sdoc)

    return {
        "project": test_project,
        "audio_document": sdoc,
        "audio_filepath": str(file_path),
    }


@pytest.fixture(scope="function")
def feature_project(db_session, test_user: UserORM) -> FeatureProject:
    """The project described in `FeatureProject`."""
    return create_feature_project(db_session, test_user)


# --- a new pipeline step, declared in the test -------------------------------


class DummyStep(TypedDict):
    step: JobType
    artefact: Artefact
    # the content of each document the step ran for, by document id
    computed: dict[int, str]


class DummyJobInput(SdocProcessingJobInput):
    text: str


# the str enums a new step adds a value to
E = TypeVar("E", JobType, Artefact)


def _add_enum_member(enum_cls: type[E], name: str, value: str) -> E:
    """Add a member to an enum, as a new value in its source file would."""
    member = str.__new__(enum_cls, value)
    member._name_ = name
    member._value_ = value
    enum_cls._member_map_[name] = member
    enum_cls._value2member_map_[value] = member
    enum_cls._member_names_.append(name)
    return member


def _remove_enum_member(enum_cls: type[Enum], member: Enum) -> None:
    del enum_cls._member_map_[member.name]
    del enum_cls._value2member_map_[member.value]
    enum_cls._member_names_.remove(member.name)


@pytest.fixture(scope="function")
def dummy_step() -> Generator[DummyStep, None, None]:
    """
    Declares a new pipeline step the way a developer adds one: a `JobType` value
    (`test_dummy_step`), a core artefact it produces (`test_dummy_artefact`, in
    `Artefact` and `CORE_ARTEFACTS`) and one `@register_job` declaration with an
    enricher. Nothing else is registered.

    The step requires the content of a document, so it follows `text_extraction`
    and runs for all doctypes that have content. Its enricher loads the content from the document data;
    its handler records it in `computed`. The fixture removes the step again.
    """
    step = _add_enum_member(JobType, "TEST_DUMMY_STEP", "test_dummy_step")
    artefact = _add_enum_member(Artefact, "TEST_DUMMY_ARTEFACT", "test_dummy_artefact")
    # every module that imported CORE_ARTEFACTS sees the new core artefact
    core = artefact_enum.CORE_ARTEFACTS | {artefact}
    importers = [
        module
        for module in list(sys.modules.values())
        if getattr(module, "CORE_ARTEFACTS", None) is artefact_enum.CORE_ARTEFACTS
    ]
    patches = [patch.object(module, "CORE_ARTEFACTS", core) for module in importers]
    for p in patches:
        p.start()

    computed: dict[int, str] = {}

    def enrich(payload: SdocProcessingJobInput) -> DummyJobInput:
        with SQLRepo().transaction() as db:
            content = crud_sdoc_data.read(db=db, id=payload.sdoc_id).content
        return DummyJobInput(**payload.model_dump(), text=content)

    def handle_dummy_job(payload: DummyJobInput, job: Job) -> None:
        computed[payload.sdoc_id] = payload.text

    register_job(
        job_type=step,
        input_type=DummyJobInput,
        enricher=enrich,
        requires={Artefact.CONTENT},
        produces={artefact},
        doctypes={DocType.text, DocType.image, DocType.audio, DocType.video},
    )(handle_dummy_job)

    yield {"step": step, "artefact": artefact, "computed": computed}

    JobService().job_registry.pop(step)
    pipeline_registry._steps.pop(step)
    pipeline_registry._graph = None
    for p in patches:
        p.stop()
    _remove_enum_member(Artefact, artefact)
    _remove_enum_member(JobType, step)


# long enough for the HTML cleaning (readability), which drops a short text
DUMMY_UPLOAD_TEXT = (
    "A new pipeline step needs only its declaration. The pipeline derives its "
    "order from the artefacts it requires and produces. The enricher loads the "
    "input of the step from the stored data of the document. This text is long "
    "enough to keep the cleaning of the HTML from dropping it."
)


@pytest.fixture(scope="function")
def unregistered_job_type() -> Generator[JobType, None, None]:
    """A new `JobType` value (`test_unregistered_step`) that no job registers."""
    job_type = _add_enum_member(
        JobType, "TEST_UNREGISTERED_STEP", "test_unregistered_step"
    )
    yield job_type
    JobService().job_registry.pop(job_type, None)
    _remove_enum_member(JobType, job_type)


class DummyStepProjects(TypedDict):
    project: ProjectORM
    target_project: ProjectORM
    upload: Path


@pytest.fixture(scope="function")
def dummy_step_projects(
    db_session: Session, test_user: UserORM, dummy_step: DummyStep
) -> DummyStepProjects:
    """
    With the step of `dummy_step` declared, this fixture sets up two projects of
    the test user without any feature enabled (core steps only):

    - "Dummy Step Project" (`project`), with no documents yet; the text file
      `upload` (`DUMMY_UPLOAD_TEXT`, one paragraph) lies in its file directory, as an
      upload puts it there before `sdoc_init` creates its document.
    - "Import Target" (`target_project`), with no documents.
    """
    project = create_project_with_features(
        db_session, test_user, title="Dummy Step Project", features=[]
    )
    target_project = create_project_with_features(
        db_session, test_user, title="Import Target", features=[]
    )
    fsr = FilesystemRepo()
    upload = fsr.move_file_to_project_sdoc_files(
        project_id=project.id,
        src_file=fsr.write_text_to_temp_file(DUMMY_UPLOAD_TEXT),
    )
    return {"project": project, "target_project": target_project, "upload": upload}


@pytest.fixture(scope="function")
def started_jobs() -> Generator[list[tuple[JobType, JobInputBase]], None, None]:
    """Captures the jobs started while the fixture is active instead of enqueueing
    them, so the test runs the step jobs itself."""
    started: list[tuple[JobType, JobInputBase]] = []

    def _start_job(job_type: JobType, payload: JobInputBase, priority=None) -> None:
        started.append((job_type, payload))

    with patch.object(JobService, "start_job", side_effect=_start_job):
        yield started
