from collections.abc import Iterator
from datetime import UTC, datetime
from typing import TypedDict

import ffmpeg
import pytest
from loguru import logger
from PIL import Image
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.meta_type_enum import MetaType
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.document_embedding_crud import crud_document_embedding
from core.doc.document_embedding_dto import DocumentObjectIdentifier
from core.doc.image_embedding_crud import crud_image_embedding
from core.doc.image_embedding_dto import ImageObjectIdentifier
from core.doc.sdoc_elastic_crud import crud_sdoc_elastic
from core.doc.sdoc_elastic_dto import ElasticSearchDocumentCreate
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.sentence_embedding_dto import SentenceObjectIdentifier
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_dto import SourceDocumentDataCreate
from core.doc.source_document_dto import (
    SourceDocumentCreate,
    SourceDocumentRead,
)
from core.doc.source_document_orm import SourceDocumentORM
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataCreate
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService
from core.prompt.prompt_defaults import DEFAULT_PROMPTS
from core.prompt.prompt_dto import PromptCreate, PromptRead, PromptVersionCreate
from core.prompt.prompt_enum import OutputFormat, PromptLanguage, TaskType
from core.prompt.prompt_service import PromptService
from core.tag.tag_crud import crud_tag
from core.tag.tag_dto import TagCreate
from core.user.user_crud import crud_user
from core.user.user_orm import UserORM
from dats_test_utils import create_text_document
from feature_test_utils import (
    create_project_with_features,
    minimal_image_steps,
    minimal_text_steps,
    set_step_status,
)
from modules.agreement.agreement_dto import AgreementCodeScore, AgreementScore
from modules.agreement.agreement_enum import AgreementScoring
from modules.doc_processing.image.image_thumbnail_generation_job import (
    generate_thumbnails,
)
from modules.doc_processing.video.video_audio_extraction_job import (
    extract_audio_stream,
)
from modules.doc_processing.video.video_thumbnail_generation_job import (
    store_video_thumbnail,
)
from modules.experiment.experiment_crud import crud_experiment
from modules.experiment.experiment_dto import ExperimentCreateIntern
from modules.experiment.experiment_orm import ExperimentORM, ExperimentRunORM
from modules.experiment.experiment_run_crud import crud_experiment_run
from modules.experiment.experiment_run_dto import (
    ExperimentRunCreateIntern,
    ExperimentRunScores,
    ExperimentRunUpdateIntern,
)
from modules.word_frequency.word_frequency_crud import crud_word_frequency
from modules.word_frequency.word_frequency_dto import WordFrequencyCreate
from pipeline_test_utils import core_steps, step_names
from prompt_test_utils import (
    PromptEximportProjects,
    create_prompt_eximport_projects,
    create_prompt_project,
    prompt_code,
)
from provenance_test_utils import (
    ProvenanceProjectWithCopies,
    create_provenance_copies,
    create_provenance_project,
)
from repos.elastic.elastic_repo import ElasticSearchRepo
from repos.filesystem_repo import FilesystemRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.job_system.job_system_enum import JobStatus
from virtual_user_test_utils import VirtualUserProject, create_virtual_user_project


class MissingValueNamedCodes(TypedDict):
    project: ProjectORM
    target_project: ProjectORM
    na_code: CodeORM
    null_code: CodeORM


class EmptyDescriptionProjects(TypedDict):
    project: ProjectORM
    target_project: ProjectORM


def _create_target_project(db_session, test_user: UserORM) -> ProjectORM:
    return crud_project.read(
        db=db_session,
        id=ProjectService()
        .create_project(
            db=db_session,
            create_dto=ProjectCreate(
                title="Import Target", description="The project data is imported to"
            ),
            creating_user_id=test_user.id,
        )
        .id,
    )


@pytest.fixture(scope="function")
def missing_value_named_codes(
    db_session, test_user, test_project
) -> MissingValueNamedCodes:
    """
    This fixture sets up the following projects:

    - Project "Simple Test Project" (`project`) of the test user, with its system
      codes and two codes named like missing values in pandas:
      - "NA" (`na_code`, color "red", description "N/A"), a top-level code,
      - "null" (`null_code`, color "blue", description "null"), a child of "NA".
    - Project "Import Target" (`target_project`) of the test user, with only its
      system codes.

    Non-obvious derived behavior:

    - pandas reads the cells "NA", "N/A" and "null" as missing values by default.
    - The exported parent of "NA" is an empty cell, which must stay missing (None).
    """
    na_code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="NA",
            color="red",
            description="N/A",
            parent_id=None,
            enabled=True,
            project_id=test_project.id,
            is_system=False,
        ),
    )
    null_code = crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="null",
            color="blue",
            description="null",
            parent_id=na_code.id,
            enabled=True,
            project_id=test_project.id,
            is_system=False,
        ),
    )
    target_project = _create_target_project(db_session, test_user)
    db_session.commit()
    db_session.refresh(test_project)

    return {
        "project": test_project,
        "target_project": target_project,
        "na_code": na_code,
        "null_code": null_code,
    }


@pytest.fixture(scope="function")
def empty_description_projects(
    db_session, test_user, test_project
) -> EmptyDescriptionProjects:
    """
    This fixture sets up the following projects:

    - Project "Simple Test Project" (`project`) of the test user, with its system
      codes and project metadata, plus three objects with an empty description:
      - the code "Undescribed code" (color "red"), a top-level code,
      - the tag "Undescribed tag" (color "blue"), a top-level tag,
      - the text metadata field "undescribed" of text documents.
    - Project "Import Target" (`target_project`) of the test user, with only its
      system codes and project metadata.

    Non-obvious derived behavior:

    - The export writes an empty description as an empty cell, which the import
      reads as a missing value (None).
    """
    crud_code.create(
        db=db_session,
        create_dto=CodeCreate(
            name="Undescribed code",
            color="red",
            description="",
            parent_id=None,
            enabled=True,
            project_id=test_project.id,
            is_system=False,
        ),
    )
    crud_tag.create(
        db=db_session,
        create_dto=TagCreate(
            name="Undescribed tag",
            color="blue",
            description="",
            project_id=test_project.id,
        ),
    )
    crud_project_meta.create(
        db=db_session,
        create_dto=ProjectMetadataCreate(
            key="undescribed",
            metatype=MetaType.STRING,
            doctype=DocType.text,
            description="",
            project_id=test_project.id,
        ),
    )
    target_project = _create_target_project(db_session, test_user)
    db_session.commit()
    db_session.refresh(test_project)

    return {"project": test_project, "target_project": target_project}


@pytest.fixture(scope="function")
def provenance_project_with_copies(
    db_session, test_user, project_with_sdoc
) -> ProvenanceProjectWithCopies:
    """The project described in `ProvenanceProjectWithCopies`."""
    return create_provenance_copies(
        db_session, create_provenance_project(db_session, test_user, project_with_sdoc)
    )


@pytest.fixture(scope="function")
def virtual_user_project(
    db_session, test_user: UserORM, test_project: ProjectORM
) -> VirtualUserProject:
    """The projects described in `VirtualUserProject`."""
    return create_virtual_user_project(db_session, test_user, test_project)


@pytest.fixture(scope="function")
def prompt_eximport_projects(
    db_session, test_project: ProjectORM, test_user: UserORM
) -> PromptEximportProjects:
    """The projects described in `PromptEximportProjects`."""
    return create_prompt_eximport_projects(
        db_session,
        create_prompt_project(db_session, test_project, test_user),
        test_user,
    )


class ExperimentEximportProjects(TypedDict):
    """
    This fixture sets up the following projects:

    - Project "Simple Test Project" (`project`) of the test user ("Test User",
      testuser@dats.org), created by the project service (system codes, the 10
      default prompts), with:
      - the codes "Claim" (`code_claim`) and "Evidence" (`code_evidence`);
      - the text documents "doc_a.txt" (`sdoc_a`, "Anna met Bob.") and
        "doc_b.txt" (`sdoc_b`, "Cara left early."), with their raw files;
      - the virtual users "Group standard" (`group_user`), "Stage1-Run1"
        (`run1_user`) and "Stage1-Run2" (`run2_user`), without annotations;
      - the prompt "Claim and Evidence" (`prompt`, span annotation, English) of
        the test user, whose versions select Claim and Evidence: version 1 has the
        English inline default prompt, version 2 "Changed: " + that prompt;
      - the experiment "Stage1" (`stage1`): span annotation, documents A and B,
        codes Claim and Evidence, gold annotator the test user, with the runs
        - `run1` "Run1": version 1 of `prompt`, model "model-a", documents A and
          B, virtual user `run1_user`, started by the test user, status finished,
          started at `STARTED`, finished at `FINISHED`, the stored scores
          `run1_scores(code_claim, code_evidence)` computed at `SCORES_COMPUTED`;
        - `run2` "Run2": version 2 of `prompt`, model "model-b", documents A and
          B, virtual user `run2_user`, started by the test user, status failed,
          started at `STARTED`, finished at `FINISHED`, no stored scores;
      - the experiment "Stage2" (`stage2`): sentence annotation, document A, code
        Claim, gold annotator the virtual user `group_user`, without runs.
    - Project "Import Target" (`target_project`) of the test user, created by the
      project service (system codes, default prompts), with the prompt "Claim and
      Evidence" (`target_prompt`, span annotation, English) of the test user,
      whose only version has the text "Another prompt: " + the English inline
      default prompt and selects no codes.

    Non-obvious derived behavior:

    - The experiments and runs are created directly in the database, so the gold
      annotators annotated no document.
    - Virtual users have generated, instance-wide unique emails, so the users
      import creates them only in the project they belong to: a project import of
      `project` into `target_project` needs `project` (with its virtual users)
      deleted first, as when a backup is restored.
    - `prompt` differs from `target_prompt`, so the prompt import imports it into
      `target_project` as "Claim and Evidence (imported)".
    """

    project: ProjectORM
    target_project: ProjectORM
    code_claim: CodeORM
    code_evidence: CodeORM
    sdoc_a: SourceDocumentORM
    sdoc_b: SourceDocumentORM
    group_user: UserORM
    run1_user: UserORM
    run2_user: UserORM
    prompt: PromptRead
    target_prompt: PromptRead
    stage1: ExperimentORM
    stage2: ExperimentORM
    run1: ExperimentRunORM
    run2: ExperimentRunORM


STARTED = datetime(2026, 1, 1, 10, 0, tzinfo=UTC)
FINISHED = datetime(2026, 1, 1, 10, 5, tzinfo=UTC)
SCORES_COMPUTED = datetime(2026, 1, 1, 10, 6, tzinfo=UTC)


def run1_scores(
    code_claim: CodeORM, code_evidence: CodeORM
) -> list[ExperimentRunScores]:
    """The stored scores of `run1`, the same for every scoring: Claim TP 1 / FN 1,
    Evidence FP 1 / FN 1, total TP 1 / FP 1 / FN 2."""
    return [
        ExperimentRunScores(
            scoring=scoring,
            num_units=4,
            total=AgreementScore(
                true_positives=1,
                false_positives=1,
                false_negatives=2,
                precision=0.5,
                recall=1 / 3,
                f1=0.4,
            ),
            code_scores=[
                AgreementCodeScore(
                    code_id=code_claim.id,
                    true_positives=1,
                    false_positives=0,
                    false_negatives=1,
                    precision=1.0,
                    recall=0.5,
                    f1=2 / 3,
                ),
                AgreementCodeScore(
                    code_id=code_evidence.id,
                    true_positives=0,
                    false_positives=1,
                    false_negatives=1,
                    precision=0.0,
                    recall=0.0,
                    f1=0.0,
                ),
            ],
        )
        for scoring in AgreementScoring
    ]


def _create_text_document_with_file(
    db: Session, *, project: ProjectORM, filename: str, sentences: list[str]
) -> SourceDocumentORM:
    """A text document with its raw file, which the documents export needs."""
    sdoc = create_text_document(
        db, project=project, filename=filename, name=filename, sentences=sentences
    )
    path = FilesystemRepo()._get_dst_path_for_project_sdoc_file(
        project_id=project.id, filename=filename
    )
    path.write_text(" ".join(sentences))
    return sdoc


def _create_video_document_with_file(
    db: Session, *, project: ProjectORM
) -> SourceDocumentORM:
    """The video "clip.mp4" of `feature_toggle_eximport_projects`: its file, its
    transcript, and the audio stream and thumbnail its steps write."""
    video = crud_sdoc.create(
        db=db,
        create_dto=SourceDocumentCreate(
            filename="clip.mp4",
            name="clip.mp4",
            doctype=DocType.video,
            project_id=project.id,
        ),
    )
    video_path = FilesystemRepo().get_path_to_sdoc_file(
        SourceDocumentRead.model_validate(video)
    )
    picture = ffmpeg.input("testsrc=duration=1:size=64x64:rate=10", f="lavfi")
    tone = ffmpeg.input("sine=frequency=440:duration=1", f="lavfi")
    ffmpeg.output(
        picture, tone, str(video_path), pix_fmt="yuv420p"
    ).overwrite_output().run(quiet=True)
    crud_sdoc_data.create(
        db=db,
        create_dto=SourceDocumentDataCreate(
            id=video.id,
            content="Hello world.",
            repo_url=str(video_path.relative_to(FilesystemRepo().root_dir)),
            raw_html="<html><body><p>Hello world.</p></body></html>",
            html="<p>Hello world.</p>",
            token_starts=[0, 6],
            token_ends=[5, 12],
            sentence_starts=[0],
            sentence_ends=[12],
            token_time_starts=[0, 500],
            token_time_ends=[400, 900],
        ),
    )
    extract_audio_stream(video_path)
    store_video_thumbnail(
        db=db, sdoc=SourceDocumentRead.model_validate(video), video_path=video_path
    )
    return video


@pytest.fixture(scope="function")
def experiment_eximport_projects(
    db_session: Session, test_project: ProjectORM, test_user: UserORM
) -> ExperimentEximportProjects:
    """The projects described in `ExperimentEximportProjects`."""
    db = db_session
    project = test_project
    pts = PromptService()
    inline_text = DEFAULT_PROMPTS[OutputFormat.INLINE][PromptLanguage.EN]

    # 1) codes, documents and virtual users
    code_claim, code_evidence = [
        crud_code.create(
            db=db,
            create_dto=CodeCreate(
                name=name,
                description=f"{name} code",
                project_id=project.id,
                is_system=False,
            ),
        )
        for name in ("Claim", "Evidence")
    ]
    sdoc_a = _create_text_document_with_file(
        db, project=project, filename="doc_a.txt", sentences=["Anna met Bob."]
    )
    sdoc_b = _create_text_document_with_file(
        db, project=project, filename="doc_b.txt", sentences=["Cara left early."]
    )
    group_user, run1_user, run2_user = [
        crud_user.create_virtual_user(db=db, project_id=project.id, name=name)
        for name in ("Group standard", "Stage1-Run1", "Stage1-Run2")
    ]

    # 2) the prompt with two versions
    codes = [prompt_code(code_claim), prompt_code(code_evidence)]
    prompt = pts.create_prompt(
        db=db,
        user_id=test_user.id,
        create_dto=PromptCreate(
            project_id=project.id,
            name="Claim and Evidence",
            task_type=TaskType.ANNOTATION,
            language=PromptLanguage.EN,
            text=inline_text,
            codes=codes,
        ),
    )
    prompt = pts.create_prompt_version(
        db=db,
        user_id=test_user.id,
        prompt_id=prompt.id,
        create_dto=PromptVersionCreate(text="Changed: " + inline_text, codes=codes),
    )

    # 3) the experiments and the runs of Stage1
    stage1, stage2 = crud_experiment.create_multi(
        db=db,
        create_dtos=[
            ExperimentCreateIntern(
                name="Stage1",
                project_id=project.id,
                task_type=TaskType.ANNOTATION,
                sdoc_ids=[sdoc_a.id, sdoc_b.id],
                code_ids=[code_claim.id, code_evidence.id],
                gold_user_id=test_user.id,
            ),
            ExperimentCreateIntern(
                name="Stage2",
                project_id=project.id,
                task_type=TaskType.SENTENCE_ANNOTATION,
                sdoc_ids=[sdoc_a.id],
                code_ids=[code_claim.id],
                gold_user_id=group_user.id,
            ),
        ],
    )
    run1, run2 = crud_experiment_run.create_multi(
        db=db,
        create_dtos=[
            ExperimentRunCreateIntern(
                experiment_id=stage1.id,
                name=name,
                prompt_version_id=version.id,
                model=model,
                sdoc_ids=[sdoc_a.id, sdoc_b.id],
                virtual_user_id=virtual_user.id,
                user_id=test_user.id,
                status=status,
            )
            for name, version, model, virtual_user, status in (
                ("Run1", prompt.versions[0], "model-a", run1_user, JobStatus.FINISHED),
                ("Run2", prompt.versions[1], "model-b", run2_user, JobStatus.FAILED),
            )
        ],
    )
    crud_experiment_run.update_multi(
        db=db,
        ids=[run1.id, run2.id],
        update_dtos=[
            ExperimentRunUpdateIntern(
                started=STARTED,
                finished=FINISHED,
                scores=run1_scores(code_claim, code_evidence),
                scores_computed=SCORES_COMPUTED,
            ),
            ExperimentRunUpdateIntern(started=STARTED, finished=FINISHED),
        ],
    )

    # 4) the target project with another prompt of the same name
    target_project = _create_target_project(db, test_user)
    target_prompt = pts.create_prompt(
        db=db,
        user_id=test_user.id,
        create_dto=PromptCreate(
            project_id=target_project.id,
            name="Claim and Evidence",
            task_type=TaskType.ANNOTATION,
            language=PromptLanguage.EN,
            text="Another prompt: " + inline_text,
        ),
    )

    db.commit()
    for obj in (project, stage1, stage2, run1, run2):
        db.refresh(obj)
    return {
        "project": project,
        "target_project": target_project,
        "code_claim": code_claim,
        "code_evidence": code_evidence,
        "sdoc_a": sdoc_a,
        "sdoc_b": sdoc_b,
        "group_user": group_user,
        "run1_user": run1_user,
        "run2_user": run2_user,
        "prompt": prompt,
        "target_prompt": target_prompt,
        "stage1": stage1,
        "stage2": stage2,
        "run1": run1,
        "run2": run2,
    }


@pytest.fixture(scope="function")
def experiment_eximport_projects_without_gold(
    db_session: Session, experiment_eximport_projects: ExperimentEximportProjects
) -> ExperimentEximportProjects:
    """The projects of `experiment_eximport_projects` after the virtual user
    `group_user`, the gold annotator of "Stage2", was deleted: "Stage2" keeps its
    documents and codes, but has no gold annotator (`gold_user_id` NULL)."""
    projects = experiment_eximport_projects
    crud_user.delete(db=db_session, id=projects["group_user"].id)
    db_session.commit()
    db_session.refresh(projects["stage2"])
    return projects


@pytest.fixture(scope="function")
def logged_warnings() -> Iterator[list[str]]:
    """The messages of the warnings (and errors) logged during the test."""
    messages: list[str] = []
    handler_id = logger.add(
        lambda message: messages.append(message.record["message"]), level="WARNING"
    )
    yield messages
    logger.remove(handler_id)


class FeatureToggleEximportProjects(TypedDict):
    project: ProjectORM
    target_project: ProjectORM
    text: SourceDocumentORM
    image: SourceDocumentORM
    video: SourceDocumentORM
    sentence_embeddings: list[list[float]]


def minimal_video_steps() -> list[str]:
    """The steps of a video document in a project without features."""
    return step_names(core_steps(DocType.video))


def toggled_text_steps() -> list[str]:
    """The steps of the text document of `feature_toggle_eximport_projects`."""
    return [
        *minimal_text_steps(),
        "text_word_frequency",
        "text_es_index",
        "text_sentence_embedding",
        "text_document_embedding",
    ]


def toggled_image_steps() -> list[str]:
    """The steps of the image document of `feature_toggle_eximport_projects`."""
    return [*minimal_image_steps(), "image_embedding"]


@pytest.fixture(scope="function")
def feature_toggle_eximport_projects(
    db_session: Session, test_user: UserORM
) -> FeatureToggleEximportProjects:
    """
    This fixture sets up the following projects of the test user:

    - Project "Toggled Project" (`project`), which enables only sentence
      similarity search (all other features are disabled), with three documents
      that hold the data of every archive module (`artefact_archive.py`):
      - "text.txt" (`text`), a text document with the 30 sentences "Sentence
        0." to "Sentence 29.", its raw file, and finished `toggled_text_steps()`
        (the core steps, `text_word_frequency`, `text_es_index`,
        `text_sentence_embedding` and `text_document_embedding`); every other
        step is not planned. Each sentence has its own embedding in Weaviate
        (`sentence_embeddings`, by sentence id): sentence i has 1.0 at position
        i of 30. Its document embedding is [0.1, 0.2, 0.3], its word
        frequencies are ("sentence", 30) and ("29", 1), and it has its
        Elasticsearch entry (filename and content).
      - "image.png" (`image`), a 4x4 PNG image with its raw file, the WebP and
        thumbnail that image_thumbnail writes, without caption (empty content,
        HTML and raw HTML), the image embedding [0.4, 0.5] and finished
        `toggled_image_steps()` (the core steps and `image_embedding`); every
        other step is not planned.
      - "clip.mp4" (`video`), a video of one second (a 64x64 test picture with
        a 440 Hz tone, made with ffmpeg) with its raw file, the transcript "Hello
        world." (two tokens with their times, one sentence), finished
        `minimal_video_steps()`, the audio stream that video_audio_extraction
        extracted from it and the thumbnail that video_thumbnail wrote (its
        `repo_url` links the thumbnail); every other step is not planned.
    - Project "Import Target" (`target_project`), which enables only keyword
      statistics, with no documents.

    Non-obvious derived behavior:

    - The empty HTML of the image is an empty CSV cell in the export, which
      pandas reads as a missing value.
    - The text has more sentences than Weaviate returns without a limit (25).
    """
    project = create_project_with_features(
        db_session,
        test_user,
        title="Toggled Project",
        features=[Feature.SENTENCE_SIMILARITY_SEARCH],
    )
    text = _create_text_document_with_file(
        db_session,
        project=project,
        filename="text.txt",
        sentences=[f"Sentence {i}." for i in range(30)],
    )
    sentence_embeddings = [
        [1.0 if i == j else 0.0 for j in range(30)] for i in range(30)
    ]
    crud_sentence_embedding.create_multi(
        client=WeaviateRepo().get_client(),
        project_id=project.id,
        ids=[
            SentenceObjectIdentifier(sdoc_id=text.id, sentence_id=i)
            for i in range(len(sentence_embeddings))
        ],
        embeddings=sentence_embeddings,
    )

    image = crud_sdoc.create(
        db=db_session,
        create_dto=SourceDocumentCreate(
            filename="image.png",
            name="image.png",
            doctype=DocType.image,
            project_id=project.id,
        ),
    )
    image_path = FilesystemRepo().get_path_to_sdoc_file(
        SourceDocumentRead.model_validate(image)
    )
    Image.new("RGB", (4, 4)).save(image_path, "PNG")
    generate_thumbnails(image_path)
    crud_sdoc_data.create(
        db=db_session,
        create_dto=SourceDocumentDataCreate(
            id=image.id,
            content="",
            repo_url=str(image_path.relative_to(FilesystemRepo().root_dir)),
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

    video = _create_video_document_with_file(db_session, project=project)

    client = WeaviateRepo().get_client()
    crud_document_embedding.create(
        client=client,
        project_id=project.id,
        id=DocumentObjectIdentifier(sdoc_id=text.id),
        embedding=[0.1, 0.2, 0.3],
    )
    crud_image_embedding.create(
        client=client,
        project_id=project.id,
        id=ImageObjectIdentifier(sdoc_id=image.id),
        embedding=[0.4, 0.5],
    )
    crud_word_frequency.create_multi(
        db=db_session,
        create_dtos=[
            WordFrequencyCreate(sdoc_id=text.id, word=word, count=count)
            for word, count in (("sentence", 30), ("29", 1))
        ],
    )
    text_data = crud_sdoc_data.read(db=db_session, id=text.id)
    crud_sdoc_elastic.create(
        client=ElasticSearchRepo().get_client(),
        project_id=project.id,
        create_dto=ElasticSearchDocumentCreate(
            project_id=project.id,
            sdoc_id=text.id,
            filename=text.filename,
            content=text_data.content,
        ),
    )

    set_step_status(db_session, text.id, dict.fromkeys(toggled_text_steps(), 1))
    set_step_status(db_session, image.id, dict.fromkeys(toggled_image_steps(), 1))
    set_step_status(db_session, video.id, dict.fromkeys(minimal_video_steps(), 1))
    target_project = create_project_with_features(
        db_session,
        test_user,
        title="Import Target",
        features=[Feature.KEYWORD_STATISTICS],
    )
    db_session.commit()
    for obj in (project, target_project, text, image, video):
        db_session.refresh(obj)
    return {
        "project": project,
        "target_project": target_project,
        "text": text,
        "image": image,
        "video": video,
        "sentence_embeddings": sentence_embeddings,
    }


class SdocEximportProjects(TypedDict):
    """
    This fixture sets up the following projects:

    Project "project" (the test project, owned by the test user):
    - Tag "Important"
    - Document "report.txt" (name "report.txt", text, with its raw file):
        - Sentences "Alpha beta alpha." and "Gamma delta."
        - Linked to the tag "Important"
        - Word frequencies: "alpha" 2, "beta" 1
        - Metadata: the initial metadata of a text document, with "language" = "en"
        - Document embedding SDOC_DOCUMENT_EMBEDDING
        - Sentence embeddings SDOC_SENTENCE_EMBEDDINGS (one per sentence)
        - Finished `toggled_text_steps()`; every other step is not planned

    Project "target_project" ("Import Target", owned by the test user):
    - Tag "Important" (the documents import requires the tags of the documents)
    - No documents

    Non-obvious derived behavior:
    - The documents export writes one CSV row per document. The list fields (tags,
      word frequencies, metadata, token and sentence offsets, embeddings) are cells
      with the Python representation of the list, e.g. "[('alpha', 2), ('beta', 1)]".
    - The embedding values are exact in float32, so they survive Weaviate unchanged.
    - The archive holds the word frequencies and embeddings because their steps are
      finished.
    """

    project: ProjectORM
    target_project: ProjectORM
    sdoc: SourceDocumentORM


SDOC_DOCUMENT_EMBEDDING = [0.25, 0.5, 0.75, 1.0]
SDOC_SENTENCE_EMBEDDINGS = [[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0]]


@pytest.fixture(scope="function")
def sdoc_eximport_projects(
    db_session, test_project: ProjectORM, test_user: UserORM
) -> SdocEximportProjects:
    """The projects described in `SdocEximportProjects`."""
    target_project = _create_target_project(db_session, test_user)
    tag_ids = [
        crud_tag.create(
            db=db_session,
            create_dto=TagCreate(
                name="Important", color="blue", description="", project_id=project.id
            ),
        ).id
        for project in (test_project, target_project)
    ]
    sdoc = _create_text_document_with_file(
        db_session,
        project=test_project,
        filename="report.txt",
        sentences=["Alpha beta alpha.", "Gamma delta."],
    )
    crud_tag.link_multiple_tags(db=db_session, sdoc_ids=[sdoc.id], tag_ids=tag_ids[:1])
    set_step_status(db_session, sdoc.id, dict.fromkeys(toggled_text_steps(), 1))
    crud_word_frequency.create_multi(
        db=db_session,
        create_dtos=[
            WordFrequencyCreate(sdoc_id=sdoc.id, word="alpha", count=2),
            WordFrequencyCreate(sdoc_id=sdoc.id, word="beta", count=1),
        ],
    )
    client = WeaviateRepo().get_client()
    crud_document_embedding.create(
        client=client,
        project_id=test_project.id,
        id=DocumentObjectIdentifier(sdoc_id=sdoc.id),
        embedding=SDOC_DOCUMENT_EMBEDDING,
    )
    crud_sentence_embedding.create_multi(
        client=client,
        project_id=test_project.id,
        ids=[
            SentenceObjectIdentifier(sdoc_id=sdoc.id, sentence_id=i)
            for i in range(len(SDOC_SENTENCE_EMBEDDINGS))
        ],
        embeddings=SDOC_SENTENCE_EMBEDDINGS,
    )
    db_session.commit()
    db_session.refresh(test_project)
    db_session.refresh(target_project)
    db_session.refresh(sdoc)
    return {"project": test_project, "target_project": target_project, "sdoc": sdoc}
