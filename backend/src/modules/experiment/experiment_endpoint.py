from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from core.auth.authz_user import AuthzUser
from modules.experiment.experiment_crud import crud_experiment
from modules.experiment.experiment_dto import (
    ExperimentCreate,
    ExperimentRead,
    ExperimentRunLogExportRequest,
    ExperimentUpdate,
)
from modules.experiment.experiment_run_dto import ExperimentRunCreate
from modules.experiment.experiment_service import ExperimentService
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/experiments", tags=["experiments"])

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
    db: DBSession,
    project_id: int,
    experiment: ExperimentCreate,
    ws: WebsocketEmitter = Depends(),
) -> ExperimentRead:
    result = exs.create_experiment(db=db, project_id=project_id, create_dto=experiment)
    ws.emit_to_project(DATSEvent.EXPERIMENT_CREATED, result, project_id=project_id)
    return result


@router.put(
    "/{experiment_id}/runs",
    response_model=ExperimentRead,
    summary=(
        "Creates and starts a run of an experiment with a prompt version and a "
        "model; the run writes into its own new virtual user. Returns the experiment."
    ),
)
def create_run(
    *,
    db: DBSession,
    project_id: int,
    experiment_id: int,
    run: ExperimentRunCreate,
    authz_user: AuthzUser = Depends(),
    ws: WebsocketEmitter = Depends(),
) -> ExperimentRead:
    result = exs.create_run(
        db=db,
        project_id=project_id,
        experiment_id=experiment_id,
        create_dto=run,
        user_id=authz_user.user.id,
    )
    ws.emit_to_project(
        DATSEvent.USER_CREATED, result.virtual_user, project_id=project_id
    )
    ws.emit_to_project(
        DATSEvent.EXPERIMENT_UPDATED, result.experiment, project_id=project_id
    )
    return result.experiment


# --- read operations


@router.get(
    "",
    response_model=list[ExperimentRead],
    summary="Returns all experiments of the project with their runs, newest first",
)
def get_by_project(
    *,
    db: DBSession,
    project_id: int,
) -> list[ExperimentRead]:
    db_objs = crud_experiment.read_by_project(db=db, project_id=project_id)
    return [ExperimentRead.model_validate(db_obj) for db_obj in db_objs]


@router.get(
    "/{experiment_id}",
    response_model=ExperimentRead,
    summary="Returns the experiment with its runs",
)
def get_by_id(
    *,
    db: DBSession,
    project_id: int,
    experiment_id: int,
) -> ExperimentRead:
    db_obj = crud_experiment.read(db=db, project_id=project_id, id=experiment_id)
    return ExperimentRead.model_validate(db_obj)


# --- update operations


@router.patch(
    "/{experiment_id}/runs/{run_id}/refresh-scores",
    response_model=ExperimentRead,
    summary=(
        "Recomputes and stores the agreement of the run with the gold annotator. "
        "Returns the experiment."
    ),
)
def refresh_run_scores(
    *,
    db: DBSession,
    project_id: int,
    experiment_id: int,
    run_id: int,
    ws: WebsocketEmitter = Depends(),
) -> ExperimentRead:
    result = exs.refresh_run_scores(
        db=db, project_id=project_id, experiment_id=experiment_id, run_id=run_id
    )
    ws.emit_to_project(DATSEvent.EXPERIMENT_UPDATED, result, project_id=project_id)
    return result


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
    db: DBSession,
    project_id: int,
    experiment_id: int,
    experiment: ExperimentUpdate,
    ws: WebsocketEmitter = Depends(),
) -> ExperimentRead:
    result = exs.update_experiment(
        db=db, project_id=project_id, experiment_id=experiment_id, update_dto=experiment
    )
    for virtual_user in result.virtual_users:
        ws.emit_to_project(DATSEvent.USER_UPDATED, virtual_user, project_id=project_id)
    ws.emit_to_project(
        DATSEvent.EXPERIMENT_UPDATED, result.experiment, project_id=project_id
    )
    return result.experiment


@router.patch(
    "/{experiment_id}/refresh-scores",
    response_model=ExperimentRead,
    summary=(
        "Recomputes and stores the agreement of all finished runs of the experiment "
        "with the gold annotator, so that all runs are scored against the same state "
        "of the gold annotator. Returns the experiment."
    ),
)
def refresh_scores(
    *,
    db: DBSession,
    project_id: int,
    experiment_id: int,
    ws: WebsocketEmitter = Depends(),
) -> ExperimentRead:
    result = exs.refresh_all_run_scores(
        db=db, project_id=project_id, experiment_id=experiment_id
    )
    ws.emit_to_project(DATSEvent.EXPERIMENT_UPDATED, result, project_id=project_id)
    return result


# --- delete operations


@router.delete(
    "/{experiment_id}/runs/{run_id}",
    response_model=ExperimentRead,
    summary=(
        "Removes the run with its virtual user and its annotations. "
        "Returns the experiment."
    ),
)
def delete_run(
    *,
    db: DBSession,
    project_id: int,
    experiment_id: int,
    run_id: int,
    ws: WebsocketEmitter = Depends(),
) -> ExperimentRead:
    result = exs.delete_run(
        db=db, project_id=project_id, experiment_id=experiment_id, run_id=run_id
    )
    ws.emit_to_project(
        DATSEvent.USER_DELETED, result.virtual_user, project_id=project_id
    )
    ws.emit_to_project(
        DATSEvent.EXPERIMENT_UPDATED, result.experiment, project_id=project_id
    )
    return result.experiment


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
    db: DBSession,
    project_id: int,
    experiment_id: int,
    ws: WebsocketEmitter = Depends(),
) -> ExperimentRead:
    result = exs.delete_experiment(
        db=db, project_id=project_id, experiment_id=experiment_id
    )
    for virtual_user in result.virtual_users:
        ws.emit_to_project(DATSEvent.USER_DELETED, virtual_user, project_id=project_id)
    ws.emit_to_project(
        DATSEvent.EXPERIMENT_DELETED, result.experiment, project_id=project_id
    )
    return result.experiment


# --- other operations


@router.post(
    "/{experiment_id}/runs/{run_id}/export-log",
    response_model=str,
    summary="Exports the log of a run as JSON or CSV. Returns the URL of the file.",
)
def export_run_log(
    *,
    db: DBSession,
    project_id: int,
    experiment_id: int,
    run_id: int,
    request: ExperimentRunLogExportRequest,
) -> str:
    return exs.export_run_log(
        db=db,
        project_id=project_id,
        experiment_id=experiment_id,
        run_id=run_id,
        export_format=request.export_format,
    )
