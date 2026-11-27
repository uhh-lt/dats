from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from modules.perspectives.aspect_crud import crud_aspect
from modules.perspectives.aspect_dto import AspectRead, AspectUpdateIntern
from modules.perspectives.perspectives_exceptions import PerspectivesJobRunningError
from modules.perspectives.perspectives_job_dto import (
    PerspectivesJobInput,
    PerspectivesJobRead,
    PerspectivesJobStart,
)
from systems.job_system.job_dto import RUNNING_JOB_STATUS
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import JobStatus
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/jobs/perspectives", tags=["jobs"])

js = JobService()


# --- job operations


@router.post(
    "",
    response_model=PerspectivesJobRead,
    summary="Starts the PerspectivesJob of the Aspect for the given Parameters. If a job of the Aspect is still running, this answers 400.",
)
def start_perspectives_job(
    *,
    db: DBSession,
    project_id: int,
    perspectives_job: PerspectivesJobStart,
    ws: WebsocketEmitter = Depends(),
) -> PerspectivesJobRead:
    aspect_id = perspectives_job.aspect_id
    aspect = crud_aspect.read(db=db, project_id=project_id, id=aspect_id)

    # Check if there is a job running already for this aspect
    if aspect.most_recent_job_id:
        most_recent_job = js.get_job(aspect.most_recent_job_id)
        if (
            most_recent_job
            and JobStatus(most_recent_job.get_status()) in RUNNING_JOB_STATUS
        ):
            raise PerspectivesJobRunningError(job_id=most_recent_job.get_id())

    # No job running, so we can start a new one
    job = js.start_job(
        "perspectives",
        payload=PerspectivesJobInput(
            project_id=project_id,
            aspect_id=aspect_id,
            perspectives_job_type=perspectives_job.parameters.perspectives_job_type,
            parameters=perspectives_job.parameters,
        ),
    )

    # Update the aspect with the new job ID
    db_aspect = crud_aspect.update(
        db=db,
        project_id=project_id,
        id=aspect_id,
        update_dto=AspectUpdateIntern(
            most_recent_job_id=job.get_id(),
        ),
    )
    ws.emit_to_project(
        DATSEvent.ASPECT_UPDATED,
        AspectRead.model_validate(db_aspect),
        project_id=project_id,
    )

    return PerspectivesJobRead.from_rq_job(job)
