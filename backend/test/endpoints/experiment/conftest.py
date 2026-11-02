from typing import TypedDict

import pytest
from sqlalchemy.orm import Session

from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import SentenceAnnotationCreate
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.sentence_annotation_service import SentenceAnnotationService
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_crud import crud_project
from core.project.project_dto import ProjectCreate
from core.project.project_orm import ProjectORM
from core.project.project_service import ProjectService
from core.prompt.prompt_crud import crud_prompt
from core.prompt.prompt_defaults import DEFAULT_PROMPTS
from core.prompt.prompt_dto import (
    PromptCode,
    PromptCreate,
    PromptRead,
    PromptUpdate,
    PromptVersionCreate,
)
from core.prompt.prompt_enum import OutputFormat, PromptLanguage, TaskType
from core.prompt.prompt_service import PromptService
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM
from dats_test_utils import create_span_for_text, create_text_document
from experiment_test_utils import RunUserProject, create_run_user_project
from modules.experiment.experiment_crud import crud_experiment
from modules.experiment.experiment_dto import ExperimentCreateIntern
from modules.experiment.experiment_orm import ExperimentORM, ExperimentRunORM
from modules.experiment.experiment_run_crud import crud_experiment_run
from modules.experiment.experiment_run_dto import ExperimentRunCreateIntern
from systems.job_system.job_system_enum import JobStatus

# an invalid model: a run with it fails in the LLM Assistant without an LLM call
INVALID_MODEL = "definitely-not-an-available-model"


class ExperimentProject(TypedDict):
    """This fixture sets up the following project:

    - Project `project` "Simple Test Project" (the test project of `gold_user`, the
      test user "Test User"). It was created by the project service, so it also has
      the default prompts, which select no codes.
    - Users: `gold_user` (the test user) and the member `other_member` "Other
      Annotator" (other@dats.org).
    - Codes: `code_claim` "Claim", `code_evidence` "Evidence", `code_other` "Other".
    - Documents (tokens are separated by whitespace):
      - `sdoc_a` "Document A": "Anna met Bob." "They talked." (tokens 0 Anna,
        1 met, 2 Bob., 3 They, 4 talked.)
      - `sdoc_b` "Document B": "Cara left early." "Dan stayed." (tokens 0 Cara, ...)
      - `sdoc_c` "Document C": "Nobody annotated this."
    - Annotations of `gold_user`:
      - spans: `gold_anna` "Anna" Claim and `gold_bob` "Bob." Evidence in A,
        `gold_cara` "Cara" Claim in B
      - sentences: sentence 0 of A Claim, sentence 1 of B Evidence
      - nothing in C
    - Annotations of `other_member`: span "Nobody" Claim in C (nothing in A or B).
    - Prompts:
      - `span_prompt` "Claim and Evidence" (span annotation, English inline
        default prompt): version 1 selects Claim and Evidence, version 2 only Claim.
      - `archived_prompt` "Archived" (span annotation, inline): its only version
        selects Claim and Evidence; the prompt is archived.
      - `sentence_prompt` "Sentences" (sentence annotation, English sentences
        default prompt): its only version selects Claim and Evidence.
    - Experiments (both: span annotation, documents A and B, codes Claim and
      Evidence, gold annotator `gold_user`, created directly in the database):
      - `experiment` "ExperimentA" without runs.
      - `experiment_with_run` "ExperimentB" with the run `run` "Baseline": version
        1 of `span_prompt`, model `INVALID_MODEL`, documents A and B, started by
        `gold_user`, status finished, no stored scores.
    - `run_user` "ExperimentB-Baseline" is the virtual user of `run`. Its spans:
      `run_anna` "Anna" Claim and `run_met` "met" Evidence in A, nothing in B.
    - Virtual users without annotations whose names a run or a rename would need:
      `manual_user` "ExperimentA-Manual" (a run "Manual" of ExperimentA) and
      `manual_stage3_user` "Stage 3-Baseline" (ExperimentB renamed to "Stage 3").
    - `other_project` "Other Project" of the user `outsider` (outsider@dats.org);
      the test user is no member. It has the code `foreign_code` "Foreign", the
      document `foreign_sdoc` "Foreign Document" with the span "Secret" (Foreign) of
      `outsider`, and the experiment `foreign_experiment` "ForeignExperiment" on it.

    Non-obvious derived behavior:

    - "Annotated by" means the user has an annotation document for the document:
      `gold_user` annotated A and B, `other_member` only C, `run_user` only A.
    - Agreement of `run` (gold vs. run_user, codes Claim and Evidence), the same
      for both scorings (exact and per word), with 4 units: Claim TP 1 / FP 0 /
      FN 1 (Anna agrees, Cara is missed), Evidence TP 0 / FP 1 / FN 1 (met is
      extra, Bob. is missed), total TP 1 / FP 1 / FN 2.
    """

    project: ProjectORM
    gold_user: UserORM
    other_member: UserORM
    code_claim: CodeORM
    code_evidence: CodeORM
    code_other: CodeORM
    sdoc_a: SourceDocumentORM
    sdoc_b: SourceDocumentORM
    sdoc_c: SourceDocumentORM
    gold_anna: SpanAnnotationORM
    gold_bob: SpanAnnotationORM
    gold_cara: SpanAnnotationORM
    gold_sentences: list[SentenceAnnotationORM]
    span_prompt: PromptRead
    archived_prompt: PromptRead
    sentence_prompt: PromptRead
    experiment: ExperimentORM
    experiment_with_run: ExperimentORM
    run: ExperimentRunORM
    run_user: UserORM
    manual_user: UserORM
    manual_stage3_user: UserORM
    run_anna: SpanAnnotationORM
    run_met: SpanAnnotationORM
    other_project: ProjectORM
    outsider: UserORM
    foreign_code: CodeORM
    foreign_sdoc: SourceDocumentORM
    foreign_experiment: ExperimentORM


def _create_code(db: Session, *, project_id: int, name: str) -> CodeORM:
    return crud_code.create(
        db=db,
        create_dto=CodeCreate(
            name=name,
            description=f"{name} code",
            project_id=project_id,
            is_system=False,
        ),
    )


def _prompt_code(code: CodeORM) -> PromptCode:
    return PromptCode(
        code_id=code.id, name=code.name, description=code.description or ""
    )


def _create_member(
    db: Session, *, first_name: str, email: str, project: ProjectORM | None
) -> UserORM:
    user = crud_user.create(
        db=db,
        create_dto=UserCreate(
            first_name=first_name,
            last_name="Annotator",
            email=email,
            password="MyTestPassword123",
        ),
    )
    if project is not None:
        crud_project.associate_user(db=db, project_id=project.id, user_id=user.id)
    return user


def _create_sentence_annotation(
    db: Session, *, sdoc: SourceDocumentORM, sentence: int, code_id: int, user_id: int
) -> SentenceAnnotationORM:
    return crud_sentence_anno.read(
        db=db,
        id=SentenceAnnotationService()
        .create(
            db=db,
            user_id=user_id,
            create_dto=SentenceAnnotationCreate(
                sdoc_id=sdoc.id,
                sentence_id_start=sentence,
                sentence_id_end=sentence,
                code_id=code_id,
            ),
        )
        .id,
    )


def _create_experiment(
    db: Session,
    *,
    name: str,
    project: ProjectORM,
    sdocs: list[SourceDocumentORM],
    codes: list[CodeORM],
    gold_user: UserORM,
) -> ExperimentORM:
    return crud_experiment.create(
        db=db,
        create_dto=ExperimentCreateIntern(
            name=name,
            project_id=project.id,
            task_type=TaskType.ANNOTATION,
            sdoc_ids=[sdoc.id for sdoc in sdocs],
            code_ids=[code.id for code in codes],
            gold_user_id=gold_user.id,
        ),
    )


@pytest.fixture
def experiment_project(
    db_session: Session, test_project: ProjectORM, test_user: UserORM
) -> ExperimentProject:
    db = db_session
    project = test_project
    pts = PromptService()

    # users, codes and documents
    other_member = _create_member(
        db, first_name="Other", email="other@dats.org", project=project
    )
    code_claim = _create_code(db, project_id=project.id, name="Claim")
    code_evidence = _create_code(db, project_id=project.id, name="Evidence")
    code_other = _create_code(db, project_id=project.id, name="Other")
    sdoc_a = create_text_document(
        db,
        project=project,
        filename="doc_a.txt",
        name="Document A",
        sentences=["Anna met Bob.", "They talked."],
    )
    sdoc_b = create_text_document(
        db,
        project=project,
        filename="doc_b.txt",
        name="Document B",
        sentences=["Cara left early.", "Dan stayed."],
    )
    sdoc_c = create_text_document(
        db,
        project=project,
        filename="doc_c.txt",
        name="Document C",
        sentences=["Nobody annotated this."],
    )

    # the gold annotations and the annotations of the other member
    gold_anna = create_span_for_text(
        db, sdoc=sdoc_a, text="Anna", code_id=code_claim.id, user_id=test_user.id
    )
    gold_bob = create_span_for_text(
        db, sdoc=sdoc_a, text="Bob.", code_id=code_evidence.id, user_id=test_user.id
    )
    gold_cara = create_span_for_text(
        db, sdoc=sdoc_b, text="Cara", code_id=code_claim.id, user_id=test_user.id
    )
    gold_sentences = [
        _create_sentence_annotation(
            db, sdoc=sdoc_a, sentence=0, code_id=code_claim.id, user_id=test_user.id
        ),
        _create_sentence_annotation(
            db, sdoc=sdoc_b, sentence=1, code_id=code_evidence.id, user_id=test_user.id
        ),
    ]
    create_span_for_text(
        db, sdoc=sdoc_c, text="Nobody", code_id=code_claim.id, user_id=other_member.id
    )

    # prompts
    both_codes = [_prompt_code(code_claim), _prompt_code(code_evidence)]
    inline_text = DEFAULT_PROMPTS[OutputFormat.INLINE][PromptLanguage.EN]
    span_prompt = pts.create_prompt(
        db=db,
        user_id=test_user.id,
        create_dto=PromptCreate(
            project_id=project.id,
            name="Claim and Evidence",
            task_type=TaskType.ANNOTATION,
            language=PromptLanguage.EN,
            text=inline_text,
            codes=both_codes,
        ),
    )
    span_prompt = pts.create_prompt_version(
        db=db,
        user_id=test_user.id,
        prompt_id=span_prompt.id,
        create_dto=PromptVersionCreate(
            text=inline_text, codes=[_prompt_code(code_claim)]
        ),
    )
    archived_prompt = pts.create_prompt(
        db=db,
        user_id=test_user.id,
        create_dto=PromptCreate(
            project_id=project.id,
            name="Archived",
            task_type=TaskType.ANNOTATION,
            language=PromptLanguage.EN,
            text=inline_text,
            codes=both_codes,
        ),
    )
    crud_prompt.update(
        db=db, id=archived_prompt.id, update_dto=PromptUpdate(is_archived=True)
    )
    archived_prompt = pts.read_prompt(db=db, prompt_id=archived_prompt.id)
    sentence_prompt = pts.create_prompt(
        db=db,
        user_id=test_user.id,
        create_dto=PromptCreate(
            project_id=project.id,
            name="Sentences",
            task_type=TaskType.SENTENCE_ANNOTATION,
            language=PromptLanguage.EN,
            text=DEFAULT_PROMPTS[OutputFormat.SENTENCES][PromptLanguage.EN],
            codes=both_codes,
        ),
    )

    # experiments, one with a finished run
    experiment = _create_experiment(
        db,
        name="ExperimentA",
        project=project,
        sdocs=[sdoc_a, sdoc_b],
        codes=[code_claim, code_evidence],
        gold_user=test_user,
    )
    experiment_with_run = _create_experiment(
        db,
        name="ExperimentB",
        project=project,
        sdocs=[sdoc_a, sdoc_b],
        codes=[code_claim, code_evidence],
        gold_user=test_user,
    )
    run_user = crud_user.create_virtual_user(
        db=db, project_id=project.id, name="ExperimentB-Baseline"
    )
    run = crud_experiment_run.create(
        db=db,
        create_dto=ExperimentRunCreateIntern(
            experiment_id=experiment_with_run.id,
            name="Baseline",
            prompt_version_id=span_prompt.versions[0].id,
            model=INVALID_MODEL,
            sdoc_ids=[sdoc_a.id, sdoc_b.id],
            virtual_user_id=run_user.id,
            user_id=test_user.id,
            status=JobStatus.FINISHED,
        ),
    )
    manual_user = crud_user.create_virtual_user(
        db=db, project_id=project.id, name="ExperimentA-Manual"
    )
    manual_stage3_user = crud_user.create_virtual_user(
        db=db, project_id=project.id, name="Stage 3-Baseline"
    )
    run_anna = create_span_for_text(
        db, sdoc=sdoc_a, text="Anna", code_id=code_claim.id, user_id=run_user.id
    )
    run_met = create_span_for_text(
        db, sdoc=sdoc_a, text="met", code_id=code_evidence.id, user_id=run_user.id
    )

    # the project of another user
    outsider = _create_member(
        db, first_name="Outsider", email="outsider@dats.org", project=None
    )
    other_project = crud_project.read(
        db=db,
        id=ProjectService()
        .create_project(
            db=db,
            create_dto=ProjectCreate(title="Other Project", description="Not shared"),
            creating_user_id=outsider.id,
        )
        .id,
    )
    foreign_code = _create_code(db, project_id=other_project.id, name="Foreign")
    foreign_sdoc = create_text_document(
        db,
        project=other_project,
        filename="foreign.txt",
        name="Foreign Document",
        sentences=["Secret text."],
    )
    create_span_for_text(
        db,
        sdoc=foreign_sdoc,
        text="Secret",
        code_id=foreign_code.id,
        user_id=outsider.id,
    )
    foreign_experiment = _create_experiment(
        db,
        name="ForeignExperiment",
        project=other_project,
        sdocs=[foreign_sdoc],
        codes=[foreign_code],
        gold_user=outsider,
    )

    db.commit()
    return {
        "project": project,
        "gold_user": test_user,
        "other_member": other_member,
        "code_claim": code_claim,
        "code_evidence": code_evidence,
        "code_other": code_other,
        "sdoc_a": sdoc_a,
        "sdoc_b": sdoc_b,
        "sdoc_c": sdoc_c,
        "gold_anna": gold_anna,
        "gold_bob": gold_bob,
        "gold_cara": gold_cara,
        "gold_sentences": gold_sentences,
        "span_prompt": span_prompt,
        "archived_prompt": archived_prompt,
        "sentence_prompt": sentence_prompt,
        "experiment": experiment,
        "experiment_with_run": experiment_with_run,
        "run": run,
        "run_user": run_user,
        "manual_user": manual_user,
        "manual_stage3_user": manual_stage3_user,
        "run_anna": run_anna,
        "run_met": run_met,
        "other_project": other_project,
        "outsider": outsider,
        "foreign_code": foreign_code,
        "foreign_sdoc": foreign_sdoc,
        "foreign_experiment": foreign_experiment,
    }


@pytest.fixture
def run_user_project(
    db_session: Session, test_user: UserORM, test_project: ProjectORM
) -> RunUserProject:
    """The project described in `RunUserProject`."""
    return create_run_user_project(db_session, test_user, test_project)


@pytest.fixture
def gold_deleted_project(
    db_session: Session, test_user: UserORM, test_project: ProjectORM
) -> RunUserProject:
    """The project described in `RunUserProject` after its virtual gold annotator
    `group_standard` "Group Standard" was deleted (with its annotations):

    - `virtual_gold_experiment` "VirtualGold" has no gold annotator anymore
      (`gold_user_id` is None). It keeps its runs "Baseline" (with the stored
      scores TP 1 / FP 0 / FN 1), "Second" (no scores) and "Broken" (failed, no
      scores), and their run users with their annotations.
    - `human_gold_experiment` "HumanGold" is unchanged; its gold annotator is
      `gold_annotator`.
    - Accessing `group_standard` fails: its row is deleted.
    """
    project = create_run_user_project(db_session, test_user, test_project)
    crud_user.delete(db=db_session, id=project["group_standard"].id)
    db_session.commit()
    return project
