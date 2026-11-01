from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dats_event import DATSEvent
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from modules.experiment.experiment_crud import crud_experiment
from modules.experiment.experiment_dto import (
    ExperimentCreate,
    ExperimentRead,
    ExperimentUpdate,
)
from modules.experiment.experiment_enum import ExperimentRunLogFormat
from modules.experiment.experiment_run_dto import ExperimentRunCreate
from modules.experiment.experiment_service import ExperimentService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = APIRouter(
    prefix="/experiment",
    dependencies=[Depends(get_current_user)],
    tags=["experiment"],
)

exs = ExperimentService()


# --- create operations


@router.put(
    "",
    response_model=ExperimentRead,
    summary=(
        "Creates an experiment: documents, codes, task and a gold annotator who "
        "annotated every document"
    ),
)
def create(
    *,
    db: Session = Depends(get_db_session),
    experiment: ExperimentCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> ExperimentRead:
    authz_user.assert_in_project(experiment.project_id)

    result = exs.create_experiment(db=db, create_dto=experiment)
    ws.emit_to_project(
        DATSEvent.EXPERIMENT_CREATED, result, project_id=result.project_id
    )
    return result


@router.put(
    "/run",
    response_model=ExperimentRead,
    summary=(
        "Creates and starts a run of an experiment with a prompt version and a "
        "model; the run writes into its own new virtual user. Returns the experiment."
    ),
)
def create_run(
    *,
    db: Session = Depends(get_db_session),
    run: ExperimentRunCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> ExperimentRead:
    authz_user.assert_in_same_project_as(Crud.EXPERIMENT, run.experiment_id)

    result = exs.create_run(db=db, create_dto=run, user_id=authz_user.user.id)
    project_id = result.experiment.project_id
    ws.emit_to_project(
        DATSEvent.USER_CREATED, result.virtual_user, project_id=project_id
    )
    ws.emit_to_project(
        DATSEvent.EXPERIMENT_UPDATED, result.experiment, project_id=project_id
    )
    return result.experiment


# --- read operations


@router.get(
    "/{experiment_id}",
    response_model=ExperimentRead,
    summary="Returns the experiment with its runs",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    experiment_id: int,
    authz_user: AuthzUser = Depends(),
) -> ExperimentRead:
    authz_user.assert_in_same_project_as(Crud.EXPERIMENT, experiment_id)

    db_obj = crud_experiment.read(db=db, id=experiment_id)
    return ExperimentRead.model_validate(db_obj)


@router.get(
    "/project/{project_id}",
    response_model=list[ExperimentRead],
    summary="Returns all experiments of the project with their runs, newest first",
)
def get_by_project(
    *,
    db: Session = Depends(get_db_session),
    project_id: int,
    authz_user: AuthzUser = Depends(),
) -> list[ExperimentRead]:
    authz_user.assert_in_project(project_id)

    db_objs = crud_experiment.read_by_project(db=db, project_id=project_id)
    return [ExperimentRead.model_validate(db_obj) for db_obj in db_objs]


# --- update operations


@router.patch(
    "/{experiment_id}",
    response_model=ExperimentRead,
    summary=(
        "Renames the experiment and the virtual users of its runs. Documents, codes, "
        "task and gold annotator are fixed when the experiment is created."
    ),
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    experiment_id: int,
    experiment: ExperimentUpdate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> ExperimentRead:
    authz_user.assert_in_same_project_as(Crud.EXPERIMENT, experiment_id)

    result = exs.update_experiment(
        db=db, experiment_id=experiment_id, update_dto=experiment
    )
    project_id = result.experiment.project_id
    for virtual_user in result.virtual_users:
        ws.emit_to_project(DATSEvent.USER_UPDATED, virtual_user, project_id=project_id)
    ws.emit_to_project(
        DATSEvent.EXPERIMENT_UPDATED, result.experiment, project_id=project_id
    )
    return result.experiment


@router.patch(
    "/run/{run_id}/scores",
    response_model=ExperimentRead,
    summary=(
        "Recomputes and stores the agreement of the run with the gold annotator. "
        "Returns the experiment."
    ),
)
def refresh_run_scores(
    *,
    db: Session = Depends(get_db_session),
    run_id: int,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> ExperimentRead:
    authz_user.assert_in_same_project_as(Crud.EXPERIMENT_RUN, run_id)

    result = exs.refresh_run_scores(db=db, run_id=run_id)
    ws.emit_to_project(
        DATSEvent.EXPERIMENT_UPDATED, result, project_id=result.project_id
    )
    return result


# --- delete operations


@router.delete(
    "/{experiment_id}",
    response_model=ExperimentRead,
    summary=(
        "Removes the experiment with all its runs and their virtual users, "
        "including their annotations"
    ),
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    experiment_id: int,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> ExperimentRead:
    authz_user.assert_in_same_project_as(Crud.EXPERIMENT, experiment_id)

    result = exs.delete_experiment(db=db, experiment_id=experiment_id)
    project_id = result.experiment.project_id
    for virtual_user in result.virtual_users:
        ws.emit_to_project(DATSEvent.USER_DELETED, virtual_user, project_id=project_id)
    ws.emit_to_project(
        DATSEvent.EXPERIMENT_DELETED, result.experiment, project_id=project_id
    )
    return result.experiment


@router.delete(
    "/run/{run_id}",
    response_model=ExperimentRead,
    summary=(
        "Removes the run with its virtual user and its annotations. "
        "Returns the experiment."
    ),
)
def delete_run(
    *,
    db: Session = Depends(get_db_session),
    run_id: int,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> ExperimentRead:
    authz_user.assert_in_same_project_as(Crud.EXPERIMENT_RUN, run_id)

    result = exs.delete_run(db=db, run_id=run_id)
    project_id = result.experiment.project_id
    ws.emit_to_project(
        DATSEvent.USER_DELETED, result.virtual_user, project_id=project_id
    )
    ws.emit_to_project(
        DATSEvent.EXPERIMENT_UPDATED, result.experiment, project_id=project_id
    )
    return result.experiment


# --- other operations


@router.post(
    "/run/{run_id}/export_log",
    response_model=str,
    summary="Exports the log of a run as JSON or CSV. Returns the URL of the file.",
)
def export_run_log(
    *,
    db: Session = Depends(get_db_session),
    run_id: int,
    export_format: ExperimentRunLogFormat,
    authz_user: AuthzUser = Depends(),
) -> str:
    authz_user.assert_in_same_project_as(Crud.EXPERIMENT_RUN, run_id)

    return exs.export_run_log(db=db, run_id=run_id, export_format=export_format)
