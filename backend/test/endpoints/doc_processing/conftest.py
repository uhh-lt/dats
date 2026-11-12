import base64
import os
import sys
import wave
from enum import Enum
from io import BytesIO
from pathlib import Path
from typing import Generator, TypedDict, TypeVar
from unittest.mock import patch

import ffmpeg
import pytest
from PIL import Image
from sqlalchemy.orm import Session

from common import artefact_enum
from common.artefact_enum import Artefact
from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.job_type_enum import JobType
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectORM
from core.user.user_orm import UserORM
from feature_test_utils import (
    FeatureProject,
    _create_sdoc,
    create_feature_project,
    create_project_with_features,
    minimal_image_steps,
    minimal_text_steps,
)
from modules.doc_processing.doc_processing_dto import SdocProcessingJobInput
from modules.doc_processing.pipeline.pipeline_graph import pipeline_registry
from modules.doc_processing.pipeline.pipeline_step_decorator import pipeline_step
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job
from systems.job_system.job_register_decorator import register_job
from systems.job_system.job_service import JobService


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


# --- step planning ------------------------------------------------------------


class PlanningProjects(TypedDict):
    """
    This fixture sets up two projects of `test_user`; the minimal text steps are
    extract_html, text_extraction, text_language_detection, text_spacy and
    text_html_mapping, the minimal image steps image_metadata_extraction and
    image_thumbnail; steps not listed are not planned. Every text document has
    the text of `SDOC_SENTENCES` and the language "en", the image an 8x8 red
    PNG as its file:

    - project: "Planning Project", without any enabled feature
      - done: text document "done.txt"; the minimal text steps are finished
      - language_failed: text document "language_failed.txt"; extract_html and
        text_extraction are finished, text_language_detection is erroneous
      - image: image document "image.png"; the minimal image steps are finished
    - other_project: "Other Planning Project", with full-text search enabled
      - indexing: text document "indexing.txt"; the minimal text steps are
        finished, text_es_index is processing
      - new: text document "new.txt" without any step, as an upload creates it
        before it plans its steps

    Non-obvious derived behavior:

    - Full-text search needs extract_html, text_extraction and text_es_index;
      text_spacy and text_html_mapping are core steps outside it, so enabling it
      in project plans them for language_failed without planning its erroneous
      language detection again.
    - text_spacy needs text_language_detection, text_html_mapping needs
      text_spacy.
    """

    project: ProjectORM
    done: SourceDocumentORM
    language_failed: SourceDocumentORM
    image: SourceDocumentORM
    other_project: ProjectORM
    indexing: SourceDocumentORM
    new: SourceDocumentORM


@pytest.fixture(scope="function")
def planning_projects(db_session: Session, test_user: UserORM) -> PlanningProjects:
    """The projects described in `PlanningProjects`."""
    project = create_project_with_features(
        db_session, test_user, title="Planning Project", features=[]
    )
    other_project = create_project_with_features(
        db_session,
        test_user,
        title="Other Planning Project",
        features=[Feature.FULL_TEXT_SEARCH],
    )
    done = dict.fromkeys(minimal_text_steps(), 1)
    sdocs = {
        "done": (project, DocType.text, done),
        "language_failed": (
            project,
            DocType.text,
            {"extract_html": 1, "text_extraction": 1, "text_language_detection": -100},
        ),
        "image": (project, DocType.image, dict.fromkeys(minimal_image_steps(), 1)),
        "indexing": (other_project, DocType.text, {**done, "text_es_index": 0}),
        "new": (other_project, DocType.text, {}),
    }
    created = {
        key: _create_sdoc(
            db_session,
            owner,
            name=f"{key}.{'png' if doctype == DocType.image else 'txt'}",
            doctype=doctype,
            status=status,
        )
        for key, (owner, doctype, status) in sdocs.items()
    }
    db_session.commit()
    for obj in (project, other_project, *created.values()):
        db_session.refresh(obj)
    return {
        "project": project,
        "done": created["done"],
        "language_failed": created["language_failed"],
        "image": created["image"],
        "other_project": other_project,
        "indexing": created["indexing"],
        "new": created["new"],
    }


# --- a new pipeline step, declared in the test -------------------------------


class DummyStep(TypedDict):
    step: JobType
    artefact: Artefact
    # the content of each document the step ran for, by document id
    computed: dict[int, str]


class DummyJobInput(SdocProcessingJobInput):
    text: str


# what the dummy step computed, by document id; its enricher and handler are
# module-level functions, as RQ pickles a job's handler by reference
_DUMMY_COMPUTED: dict[int, str] = {}


def _enrich_dummy(payload: SdocProcessingJobInput) -> DummyJobInput:
    with SQLRepo().transaction() as db:
        content = crud_sdoc_data.read(db=db, id=payload.sdoc_id).content
    return DummyJobInput(**payload.model_dump(), text=content)


def _handle_dummy_job(payload: DummyJobInput, job: Job) -> None:
    _DUMMY_COMPUTED[payload.sdoc_id] = payload.text


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
    `Artefact` and `CORE_ARTEFACTS`) and one `@pipeline_step` declaration on a job registered
    with an enricher. Nothing else is registered.

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

    _DUMMY_COMPUTED.clear()
    pipeline_step(
        requires={Artefact.CONTENT},
        produces={artefact},
        doctypes={DocType.text, DocType.image, DocType.audio, DocType.video},
    )(
        register_job(job_type=step, input_type=DummyJobInput, enricher=_enrich_dummy)(
            _handle_dummy_job
        )
    )

    yield {"step": step, "artefact": artefact, "computed": _DUMMY_COMPUTED}

    JobService().job_registry.pop(step)
    pipeline_registry.unregister(step)
    for p in patches:
        p.stop()
    _remove_enum_member(Artefact, artefact)
    _remove_enum_member(JobType, step)


class PairedSteps(TypedDict):
    producer: JobType
    consumer: JobType
    # the documents each step ran for, by step
    ran: dict[JobType, list[int]]


# the documents each paired step ran for, by step; module-level functions, as
# RQ pickles a job's handler by reference
_PAIRED_RAN: dict[str, list[int]] = {"test_producer_step": [], "test_consumer_step": []}


def _pass_on(payload: SdocProcessingJobInput) -> SdocProcessingJobInput:
    return payload


def _handle_producer(payload: SdocProcessingJobInput, job: Job) -> None:
    _PAIRED_RAN["test_producer_step"].append(payload.sdoc_id)


def _handle_consumer(payload: SdocProcessingJobInput, job: Job) -> None:
    _PAIRED_RAN["test_consumer_step"].append(payload.sdoc_id)


@pytest.fixture(scope="function")
def paired_steps() -> Generator[PairedSteps, None, None]:
    """
    Declares two new pipeline steps with core artefacts, nothing else registered:

    - `test_producer_step` requires the content and produces the two artefacts
      `test_first_artefact` and `test_second_artefact`.
    - `test_consumer_step` requires both artefacts of `test_producer_step` and
      produces `test_third_artefact`.

    Both follow `text_extraction`, so they run for every doctype with content;
    their enrichers pass the input on as it is, their handlers record the
    document in `ran`. The fixture removes both
    steps again.

    Non-obvious derived behavior:

    - The consumer's only input step is the producer, although it requires two
      artefacts.
    """
    producer = _add_enum_member(JobType, "TEST_PRODUCER_STEP", "test_producer_step")
    consumer = _add_enum_member(JobType, "TEST_CONSUMER_STEP", "test_consumer_step")
    artefacts = [
        _add_enum_member(
            Artefact, f"TEST_{name.upper()}_ARTEFACT", f"test_{name}_artefact"
        )
        for name in ("first", "second", "third")
    ]
    core = artefact_enum.CORE_ARTEFACTS | set(artefacts)
    importers = [
        module
        for module in list(sys.modules.values())
        if getattr(module, "CORE_ARTEFACTS", None) is artefact_enum.CORE_ARTEFACTS
    ]
    patches = [patch.object(module, "CORE_ARTEFACTS", core) for module in importers]
    for p in patches:
        p.start()

    for documents in _PAIRED_RAN.values():
        documents.clear()
    ran = {producer: _PAIRED_RAN[producer.value], consumer: _PAIRED_RAN[consumer.value]}

    for step, requires, produces, handler in (
        (producer, {Artefact.CONTENT}, {artefacts[0], artefacts[1]}, _handle_producer),
        (consumer, {artefacts[0], artefacts[1]}, {artefacts[2]}, _handle_consumer),
    ):
        pipeline_step(
            requires=requires,
            produces=produces,
            doctypes={DocType.text, DocType.image, DocType.audio, DocType.video},
        )(
            register_job(
                job_type=step, input_type=SdocProcessingJobInput, enricher=_pass_on
            )(handler)
        )

    yield {"producer": producer, "consumer": consumer, "ran": ran}

    for step in (consumer, producer):
        JobService().job_registry.pop(step)
        pipeline_registry.unregister(step)
    for p in patches:
        p.stop()
    for artefact in artefacts:
        _remove_enum_member(Artefact, artefact)
    for step in (consumer, producer):
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


# --- uploads of every doctype that needs no hosted model to start ------------


class MediaUploads(TypedDict):
    project: ProjectORM
    audio: Path
    video: Path
    html_with_image: Path


@pytest.fixture(scope="function")
def media_uploads(db_session: Session, test_user: UserORM) -> MediaUploads:
    """
    This fixture sets up the project "Media Project" of the test user without any
    feature enabled (core steps only) and no documents yet. Its file directory
    holds three uploads, as an upload puts them there before `sdoc_init`
    creates their documents:

    - `audio`: "tone.mp3", one second of a 440 Hz sine tone (made with ffmpeg)
    - `video`: "clip.mp4", one second of a test picture with the same tone
    - `html_with_image`: "page.html", a paragraph and one embedded base64 PNG
      image (8x8 pixels, red)

    Non-obvious derived behavior:

    - With `extract_images`, extract_html of page.html stores the image next to
      the page and starts an `sdoc_init` for it, which creates an image document.
    - The transcription (whisper) of audio and video runs on the hosted Ray
      service, so the tests only build its input.
    """
    project = create_project_with_features(
        db_session, test_user, title="Media Project", features=[]
    )
    fsr = FilesystemRepo()
    tmp = Path(fsr.create_temp_dir("media_uploads"))
    tone = ffmpeg.input("sine=frequency=440:duration=1", f="lavfi")
    ffmpeg.output(tone, str(tmp / "tone.mp3")).overwrite_output().run(quiet=True)
    picture = ffmpeg.input("testsrc=duration=1:size=64x64:rate=10", f="lavfi")
    ffmpeg.output(
        picture, tone, str(tmp / "clip.mp4"), pix_fmt="yuv420p"
    ).overwrite_output().run(quiet=True)
    png = BytesIO()
    Image.new("RGB", (8, 8), (255, 0, 0)).save(png, format="PNG")
    image_src = "data:image/png;base64," + base64.b64encode(png.getvalue()).decode()
    (tmp / "page.html").write_text(
        f'<html><body><p>{DUMMY_UPLOAD_TEXT}</p><img src="{image_src}"></body></html>',
        encoding="utf-8",
    )

    def store(filename: str) -> Path:
        return fsr.move_file_to_project_sdoc_files(
            project_id=project.id, src_file=tmp / filename
        )

    return {
        "project": project,
        "audio": store("tone.mp3"),
        "video": store("clip.mp4"),
        "html_with_image": store("page.html"),
    }
