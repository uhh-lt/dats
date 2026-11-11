from collections.abc import Generator, Iterator
from datetime import UTC, datetime
from typing import TypedDict
from unittest.mock import patch

import pytest
from loguru import logger
from PIL import Image
from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.feature_enum import Feature
from common.job_type_enum import JobType
from common.meta_type_enum import MetaType
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
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
from modules.experiment.experiment_crud import crud_experiment
from modules.experiment.experiment_dto import ExperimentCreateIntern
from modules.experiment.experiment_orm import ExperimentORM, ExperimentRunORM
from modules.experiment.experiment_run_crud import crud_experiment_run
from modules.experiment.experiment_run_dto import (
    ExperimentRunCreateIntern,
    ExperimentRunScores,
    ExperimentRunUpdateIntern,
)
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
from repos.filesystem_repo import FilesystemRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.job_system.job_dto import JobInputBase
from systems.job_system.job_service import JobService
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
    sentence_embeddings: list[list[float]]


def toggled_text_steps() -> list[str]:
    """The steps of the text document of `feature_toggle_eximport_projects`."""
    return [*minimal_text_steps(), "text_sentence_embedding"]


@pytest.fixture(scope="function")
def feature_toggle_eximport_projects(
    db_session: Session, test_user: UserORM
) -> FeatureToggleEximportProjects:
    """
    This fixture sets up the following projects of the test user:

    - Project "Toggled Project" (`project`), which enables only sentence
      similarity search (all other features are disabled), with two documents:
      - "text.txt" (`text`), a text document with the 30 sentences "Sentence
        0." to "Sentence 29.", its raw file, and finished `toggled_text_steps()`
        (the core steps and `text_sentence_embedding`); every other step is not
        planned. Each sentence has its own embedding in Weaviate
        (`sentence_embeddings`, by sentence id): sentence i has 1.0 at position
        i of 30.
      - "image.png" (`image`), a 4x4 PNG image with its raw file, without caption
        (empty content, HTML and raw HTML), and finished `minimal_image_steps()`;
        every other step is not planned.
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

    set_step_status(db_session, text.id, dict.fromkeys(toggled_text_steps(), 1))
    set_step_status(db_session, image.id, dict.fromkeys(minimal_image_steps(), 1))
    target_project = create_project_with_features(
        db_session,
        test_user,
        title="Import Target",
        features=[Feature.KEYWORD_STATISTICS],
    )
    db_session.commit()
    for obj in (project, target_project, text, image):
        db_session.refresh(obj)
    return {
        "project": project,
        "target_project": target_project,
        "text": text,
        "image": image,
        "sentence_embeddings": sentence_embeddings,
    }


@pytest.fixture(scope="function")
def started_jobs() -> Generator[list[tuple[JobType, JobInputBase]], None, None]:
    """Captures the jobs started while the fixture is active instead of enqueueing
    them, to check that an import starts no processing."""
    started: list[tuple[JobType, JobInputBase]] = []

    def _start_job(job_type: JobType, payload: JobInputBase, priority=None) -> None:
        started.append((job_type, payload))

    with patch.object(JobService, "start_job", side_effect=_start_job):
        yield started
