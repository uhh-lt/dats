import base64
import os
import wave
from io import BytesIO
from pathlib import Path
from typing import Generator, TypedDict

import ffmpeg
import pytest
from PIL import Image
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_dto import SourceDocumentCreate
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
    set_step_status,
)
from pipeline_test_utils import artefact_named
from repos.db.sql_repo import SQLRepo
from repos.filesystem_repo import FilesystemRepo
from systems.artefact_system.artefact_dto import SdocProcessingJobInput
from systems.artefact_system.artefact_registry import (
    Artefact,
    artefact,
    artefact_registry,
)
from systems.artefact_system.artefact_system_enum import StorageKind
from systems.artefact_system.pipeline_step_decorator import pipeline_step
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


@pytest.fixture(scope="function")
def ner_pending_project(db_session, test_user: UserORM) -> FeatureProject:
    """The project described in `FeatureProject`, where text_ner of text_done is
    processing as well: planned, its job not run yet."""
    project = create_feature_project(db_session, test_user)
    set_step_status(db_session, project["text_done"].id, {"text_ner": 0})
    db_session.commit()
    return project


# --- step planning ------------------------------------------------------------


class PlanningProjects(TypedDict):
    """
    This fixture sets up two projects of `test_user`; the minimal text steps are
    extract_html, text_extraction, text_language_detection, text_spacy and
    text_html_mapping, the minimal image steps image_metadata_extraction,
    image_thumbnail, image_caption and the text steps after it; steps not
    listed are not planned. Every document has the text of `SDOC_SENTENCES`
    and the language "en" (the image as its caption), the image an 8x8 red
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
        features=["full_text_search"],
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


# --- recompute ----------------------------------------------------------------


class RemovedStepProject(TypedDict):
    """
    This fixture sets up the following project:

    - project: "Removed Step Project" of `test_user`, without any enabled
      feature
    - text: text document "text.txt" with the text of `SDOC_SENTENCES` and the
      language "en"; the steps of a project without features are finished,
      and it has a finished status row of the step "removed_step", which no
      step registers (as after a step was removed from DATS)
    """

    project: ProjectORM
    text: SourceDocumentORM


@pytest.fixture(scope="function")
def removed_step_project(db_session: Session, test_user: UserORM) -> RemovedStepProject:
    """The project described in `RemovedStepProject`."""
    project = create_project_with_features(
        db_session, test_user, title="Removed Step Project", features=[]
    )
    text = _create_sdoc(
        db_session,
        project,
        name="text.txt",
        doctype=DocType.text,
        status={**dict.fromkeys(minimal_text_steps(), 1), "removed_step": 1},
    )
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(text)
    return {"project": project, "text": text}


class RecomputeProject(TypedDict):
    """
    This fixture sets up the following project:

    - project: "Recompute Project" of `test_user`, without any enabled feature
    - text_done: text document "text_done.txt" with the text of
      `SDOC_SENTENCES` and the language "en"; the steps of a project without
      features are finished (extract_html, text_extraction,
      text_language_detection, text_spacy, text_html_mapping)
    - no_data: text document "no_data.txt" without any content (no
      SourceDocumentData); extract_html, text_extraction and
      text_language_detection are finished, text_spacy and text_html_mapping
      are processing (its spaCy job waits in the queue)
    - keywords_done: text document "keywords_done.txt" with the text of
      `SDOC_SENTENCES` and the language "en"; the steps of a project without
      features and text_keywords are finished (as if keyword statistics was
      enabled once)

    Non-obvious derived behavior:

    - No step job of no_data can start: the enricher of the language
      detection finds no content.
    - text_keywords is planned for keywords_done only.
    """

    project: ProjectORM
    text_done: SourceDocumentORM
    no_data: SourceDocumentORM
    keywords_done: SourceDocumentORM


@pytest.fixture(scope="function")
def recompute_project(db_session: Session, test_user: UserORM) -> RecomputeProject:
    """The project described in `RecomputeProject`."""
    project = create_project_with_features(
        db_session, test_user, title="Recompute Project", features=[]
    )
    text_done = _create_sdoc(
        db_session,
        project,
        name="text_done.txt",
        doctype=DocType.text,
        status=dict.fromkeys(minimal_text_steps(), 1),
    )
    no_data = crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename="no_data.txt",
            name="no_data.txt",
            doctype=DocType.text,
            project_id=project.id,
        ),
    )
    set_step_status(
        db_session,
        no_data.id,
        {
            "extract_html": 1,
            "text_extraction": 1,
            "text_language_detection": 1,
            "text_spacy": 0,
            "text_html_mapping": 0,
        },
    )
    keywords_done = _create_sdoc(
        db_session,
        project,
        name="keywords_done.txt",
        doctype=DocType.text,
        status={**dict.fromkeys(minimal_text_steps(), 1), "text_keywords": 1},
    )
    db_session.commit()
    for obj in (project, text_done, no_data, keywords_done):
        db_session.refresh(obj)
    return {
        "project": project,
        "text_done": text_done,
        "no_data": no_data,
        "keywords_done": keywords_done,
    }


# --- a new pipeline step, declared in the test -------------------------------


class DummyStep(TypedDict):
    step: str
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


@pytest.fixture(scope="function")
def dummy_step() -> Generator[DummyStep, None, None]:
    """
    Declares a new pipeline step the way a developer adds one: a job type
    (`test_dummy_step`), an always-computed artefact it produces
    (`test_dummy_artefact`, declared with `artefact(...)` as document data) and
    one `@pipeline_step` declaration on a job registered with an enricher.
    Nothing else is registered.

    The step requires the content of a document, so it follows `text_extraction`
    and runs for all doctypes that have content. Its enricher loads the content from the document data;
    its handler records it in `computed`. The fixture removes the step again.
    """
    step = "test_dummy_step"
    test_artefact = artefact(
        "test_dummy_artefact", kind=StorageKind.DOCUMENT_DATA, always=True
    )

    _DUMMY_COMPUTED.clear()
    pipeline_step(
        requires={artefact_named("content")},
        produces={test_artefact},
        doctypes={DocType.text, DocType.image, DocType.audio, DocType.video},
    )(
        register_job(job_type=step, input_type=DummyJobInput, enricher=_enrich_dummy)(
            _handle_dummy_job
        )
    )

    yield {"step": step, "artefact": test_artefact, "computed": _DUMMY_COMPUTED}

    JobService().job_registry.pop(step)
    artefact_registry.unregister_step(step)
    artefact_registry.unregister_artefact(test_artefact.name)


class PairedSteps(TypedDict):
    producer: str
    consumer: str
    # the documents each step ran for, by step
    ran: dict[str, list[int]]


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
    Declares two new pipeline steps with always-computed artefacts (declared
    with `artefact(...)` as document data), nothing else registered:

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
    producer = "test_producer_step"
    consumer = "test_consumer_step"
    artefacts = [
        artefact(f"test_{name}_artefact", kind=StorageKind.DOCUMENT_DATA, always=True)
        for name in ("first", "second", "third")
    ]

    for documents in _PAIRED_RAN.values():
        documents.clear()
    ran = {producer: _PAIRED_RAN[producer], consumer: _PAIRED_RAN[consumer]}

    for step, requires, produces, handler in (
        (
            producer,
            {artefact_named("content")},
            {artefacts[0], artefacts[1]},
            _handle_producer,
        ),
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
        artefact_registry.unregister_step(step)
    for declared in artefacts:
        artefact_registry.unregister_artefact(declared.name)


# long enough for the HTML cleaning (readability), which drops a short text
DUMMY_UPLOAD_TEXT = (
    "A new pipeline step needs only its declaration. The pipeline derives its "
    "order from the artefacts it requires and produces. The enricher loads the "
    "input of the step from the stored data of the document. This text is long "
    "enough to keep the cleaning of the HTML from dropping it."
)


@pytest.fixture(scope="function")
def unregistered_job_type() -> Generator[str, None, None]:
    """A job type (`test_unregistered_step`) that no job registers."""
    job_type = "test_unregistered_step"
    yield job_type
    JobService().job_registry.pop(job_type, None)


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
