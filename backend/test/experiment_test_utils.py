"""The run user project of the Experiment Studio tests.

The tests live with the endpoints they call (experiment, user, project); each
folder declares its own fixture from `create_run_user_project`.
"""

from typing import TypedDict

from sqlalchemy.orm import Session

from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.code.code_crud import crud_code
from core.code.code_dto import CodeCreate
from core.code.code_orm import CodeORM
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_crud import crud_project
from core.project.project_orm import ProjectORM
from core.prompt.prompt_defaults import DEFAULT_PROMPTS
from core.prompt.prompt_dto import PromptCreate, PromptRead
from core.prompt.prompt_enum import OutputFormat, PromptLanguage, TaskType
from core.prompt.prompt_service import PromptService
from core.user.user_crud import crud_user
from core.user.user_dto import UserCreate
from core.user.user_orm import UserORM
from dats_test_utils import create_span_for_text, create_text_document
from modules.experiment.experiment_crud import crud_experiment
from modules.experiment.experiment_dto import ExperimentCreateIntern
from modules.experiment.experiment_orm import ExperimentORM, ExperimentRunORM
from modules.experiment.experiment_run_crud import crud_experiment_run
from modules.experiment.experiment_run_dto import ExperimentRunCreateIntern
from modules.experiment.experiment_service import ExperimentService
from prompt_test_utils import prompt_code
from systems.job_system.job_system_enum import JobStatus

# a model no run calls: all runs are created with their results in the database
RUN_MODEL = "test-model"


class RunUserProject(TypedDict):
    """`create_run_user_project` sets up the following project:

    - `project` "Simple Test Project": the test project of the test user `user`.
    - Members: `user` (the test user) and `gold_annotator` "Gold Annotator"
      (gold@dats.org), a human who can delete their own account.
    - `group_standard` "Group Standard": a free virtual user (no run user).
    - Code `code_claim` "Claim"; document `sdoc` "Document" with the sentence
      "Anna met Bob." (tokens 0 Anna, 1 met, 2 Bob.).
    - Spans of `gold_annotator` and of `group_standard` on `sdoc`, both the same:
      "Anna" Claim and "Bob." Claim.
    - `prompt` "Claims" (span annotation, English inline default prompt): its
      only version selects Claim; every run uses it with the model `RUN_MODEL`.
    - Experiments (span annotation, document `sdoc`, code Claim, created in the
      database). Every run was started by `user`, ran on `sdoc` and writes into
      its own run user `<experiment>-<run>`:
      - `human_gold_experiment` "HumanGold", gold annotator `gold_annotator`:
        - `human_gold_run` "Baseline", finished; run user
          `human_gold_run_user` "HumanGold-Baseline" with the span `human_gold_anna`
          "Anna" Claim; its scores are stored.
      - `virtual_gold_experiment` "VirtualGold", gold annotator `group_standard`:
        - `virtual_gold_run` "Baseline", finished; run user
          `virtual_gold_run_user` "VirtualGold-Baseline" with the span
          `virtual_gold_anna` "Anna" Claim; its scores are stored.
        - `second_run` "Second", finished; run user `second_run_user`
          "VirtualGold-Second" with the spans "Anna" Claim and "Bob." Claim; no
          scores are stored yet.
        - `failed_run` "Broken", failed; run user `failed_run_user`
          "VirtualGold-Broken" without annotations; no scores.

    Non-obvious derived behavior:

    - The stored scores of both "Baseline" runs, the same for both scorings
      (exact and per word), with 2 units: total and Claim TP 1 / FP 0 / FN 1
      ("Anna" agrees, "Bob." is missed).
    - Scored now, "Second" agrees completely: TP 2 / FP 0 / FN 0.
    - The project has 4 run users (HumanGold-Baseline, VirtualGold-Baseline,
      VirtualGold-Second, VirtualGold-Broken) and 1 free virtual user
      (`group_standard`), so 5 virtual users.
    """

    project: ProjectORM
    user: UserORM
    gold_annotator: UserORM
    group_standard: UserORM
    code_claim: CodeORM
    sdoc: SourceDocumentORM
    prompt: PromptRead
    human_gold_experiment: ExperimentORM
    human_gold_run: ExperimentRunORM
    human_gold_run_user: UserORM
    human_gold_anna: SpanAnnotationORM
    virtual_gold_experiment: ExperimentORM
    virtual_gold_run: ExperimentRunORM
    virtual_gold_run_user: UserORM
    virtual_gold_anna: SpanAnnotationORM
    second_run: ExperimentRunORM
    second_run_user: UserORM
    failed_run: ExperimentRunORM
    failed_run_user: UserORM


def _create_experiment(
    db: Session,
    *,
    name: str,
    project: ProjectORM,
    sdoc: SourceDocumentORM,
    code: CodeORM,
    gold_user: UserORM,
) -> ExperimentORM:
    return crud_experiment.create(
        db=db,
        create_dto=ExperimentCreateIntern(
            name=name,
            project_id=project.id,
            task_type=TaskType.ANNOTATION,
            sdoc_ids=[sdoc.id],
            code_ids=[code.id],
            gold_user_id=gold_user.id,
        ),
    )


def _create_run(
    db: Session,
    *,
    experiment: ExperimentORM,
    name: str,
    prompt: PromptRead,
    user: UserORM,
    status: JobStatus,
) -> tuple[ExperimentRunORM, UserORM]:
    """A run with its run user `<experiment>-<run>`, as if its job had ended."""
    run_user = crud_user.create_virtual_user(
        db=db, project_id=experiment.project_id, name=f"{experiment.name}-{name}"
    )
    run = crud_experiment_run.create(
        db=db,
        create_dto=ExperimentRunCreateIntern(
            experiment_id=experiment.id,
            name=name,
            prompt_version_id=prompt.versions[0].id,
            model=RUN_MODEL,
            sdoc_ids=experiment.sdoc_ids,
            virtual_user_id=run_user.id,
            user_id=user.id,
            status=status,
        ),
    )
    return run, run_user


def create_run_user_project(
    db: Session, test_user: UserORM, test_project: ProjectORM
) -> RunUserProject:
    """Create the project described by `RunUserProject`."""
    project = test_project

    # users, code and document
    gold_annotator = crud_user.create(
        db=db,
        create_dto=UserCreate(
            first_name="Gold",
            last_name="Annotator",
            email="gold@dats.org",
            password="MyTestPassword123",
        ),
    )
    crud_project.associate_user(db=db, project_id=project.id, user_id=gold_annotator.id)
    group_standard = crud_user.create_virtual_user(
        db=db, project_id=project.id, name="Group Standard"
    )
    code_claim = crud_code.create(
        db=db,
        create_dto=CodeCreate(
            name="Claim",
            description="Claim code",
            project_id=project.id,
            is_system=False,
        ),
    )
    sdoc = create_text_document(
        db,
        project=project,
        filename="run_user_doc.txt",
        name="Document",
        sentences=["Anna met Bob."],
    )
    for gold_user in (gold_annotator, group_standard):
        for text in ("Anna", "Bob."):
            create_span_for_text(
                db, sdoc=sdoc, text=text, code_id=code_claim.id, user_id=gold_user.id
            )

    # the prompt of all runs
    prompt = PromptService().create_prompt(
        db=db,
        user_id=test_user.id,
        create_dto=PromptCreate(
            project_id=project.id,
            name="Claims",
            task_type=TaskType.ANNOTATION,
            language=PromptLanguage.EN,
            text=DEFAULT_PROMPTS[OutputFormat.INLINE][PromptLanguage.EN],
            codes=[prompt_code(code_claim)],
        ),
    )

    # the experiment of the human gold annotator
    human_gold_experiment = _create_experiment(
        db,
        name="HumanGold",
        project=project,
        sdoc=sdoc,
        code=code_claim,
        gold_user=gold_annotator,
    )
    human_gold_run, human_gold_run_user = _create_run(
        db,
        experiment=human_gold_experiment,
        name="Baseline",
        prompt=prompt,
        user=test_user,
        status=JobStatus.FINISHED,
    )
    human_gold_anna = create_span_for_text(
        db,
        sdoc=sdoc,
        text="Anna",
        code_id=code_claim.id,
        user_id=human_gold_run_user.id,
    )

    # the experiment of the virtual gold annotator
    virtual_gold_experiment = _create_experiment(
        db,
        name="VirtualGold",
        project=project,
        sdoc=sdoc,
        code=code_claim,
        gold_user=group_standard,
    )
    virtual_gold_run, virtual_gold_run_user = _create_run(
        db,
        experiment=virtual_gold_experiment,
        name="Baseline",
        prompt=prompt,
        user=test_user,
        status=JobStatus.FINISHED,
    )
    virtual_gold_anna = create_span_for_text(
        db,
        sdoc=sdoc,
        text="Anna",
        code_id=code_claim.id,
        user_id=virtual_gold_run_user.id,
    )
    second_run, second_run_user = _create_run(
        db,
        experiment=virtual_gold_experiment,
        name="Second",
        prompt=prompt,
        user=test_user,
        status=JobStatus.FINISHED,
    )
    for text in ("Anna", "Bob."):
        create_span_for_text(
            db, sdoc=sdoc, text=text, code_id=code_claim.id, user_id=second_run_user.id
        )
    failed_run, failed_run_user = _create_run(
        db,
        experiment=virtual_gold_experiment,
        name="Broken",
        prompt=prompt,
        user=test_user,
        status=JobStatus.FAILED,
    )

    # the stored scores of the "Baseline" runs
    for run in (human_gold_run, virtual_gold_run):
        ExperimentService().store_run_scores(db=db, run_id=run.id)

    db.commit()
    return {
        "project": project,
        "user": test_user,
        "gold_annotator": gold_annotator,
        "group_standard": group_standard,
        "code_claim": code_claim,
        "sdoc": sdoc,
        "prompt": prompt,
        "human_gold_experiment": human_gold_experiment,
        "human_gold_run": human_gold_run,
        "human_gold_run_user": human_gold_run_user,
        "human_gold_anna": human_gold_anna,
        "virtual_gold_experiment": virtual_gold_experiment,
        "virtual_gold_run": virtual_gold_run,
        "virtual_gold_run_user": virtual_gold_run_user,
        "virtual_gold_anna": virtual_gold_anna,
        "second_run": second_run,
        "second_run_user": second_run_user,
        "failed_run": failed_run,
        "failed_run_user": failed_run_user,
    }
