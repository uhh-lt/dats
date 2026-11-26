from typing import Any, Callable, Type

from fastapi import Depends
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ValidationError, create_model
from sqlalchemy.orm import Session

from common.project_router import project_router
from core.auth.authz_user import AuthzUser
from systems.job_system.job_dto import JobInputBase, JobRead
from systems.job_system.job_service import JobService
from systems.job_system.job_system_enum import EndpointGeneration

router = project_router("/jobs", tags=["job"])


job_service = JobService()


def _job_input(
    input_model: Type[JobInputBase], *, project_id: int, body: BaseModel
) -> JobInputBase:
    """The job input of the start body in the project of the path. The validators
    of the input run here, so their errors answer 422 like a body error."""
    try:
        return input_model(project_id=project_id, **body.model_dump())
    except ValidationError as error:
        raise RequestValidationError(error.errors(), body=body.model_dump())


def register_job_endpoints(
    job_type: str,
    input_model: Type[JobInputBase],
    read_model: Type[JobRead],
    endpoint_generation: EndpointGeneration,
    validate_input: Callable[[Session, Any], None] | None,
    validate_retry: Callable[[Session, Any], None] | None,
):
    if endpoint_generation == EndpointGeneration.NONE:
        return

    job_name = "".join([x.capitalize() for x in job_type.split("_")])
    path = f"/{job_type.replace('_', '-')}"

    # The concrete JobRead model for this job type, created once at
    # registration time and stored in the registry (single source of truth).
    JobReadModel = read_model

    starts = endpoint_generation in (EndpointGeneration.ALL, EndpointGeneration.MINIMAL)
    lists = endpoint_generation in (EndpointGeneration.ALL, EndpointGeneration.READ)

    # The body of the start route: the fields of the job input without
    # `project_id`, which comes from the path
    start_model = create_model(
        f"{job_name}JobStart",
        **{
            name: (field.annotation, field)
            for name, field in input_model.model_fields.items()
            if name != "project_id"
        },  # type: ignore[call-overload]
    )

    # Start job
    def start_job(
        project_id: int,
        body: start_model,  # type: ignore[valid-type]
        authz_user: AuthzUser = Depends(),
    ):
        payload = _job_input(input_model, project_id=project_id, body=body)
        if validate_input is not None:
            validate_input(authz_user.db, payload)
        job = job_service.start_job(job_type=job_type, payload=payload)
        return JobReadModel.from_rq_job(job)

    if starts:
        router.add_api_route(
            path,
            start_job,
            name=f"start_{job_type}_job",
            methods=["POST"],
            response_model=JobReadModel,
            summary=f"Start {job_name} job",
        )

    if lists:
        # Get all jobs of the project
        def get_jobs_by_project(project_id: int):
            jobs = job_service.get_jobs_by_project(job_type, project_id)
            jobs.sort(key=lambda x: x.get_created(), reverse=True)
            return [JobReadModel.from_rq_job(job) for job in jobs]

        router.add_api_route(
            path,
            get_jobs_by_project,
            name=f"get_{job_type}_jobs_by_project",
            methods=["GET"],
            response_model=list[JobReadModel],
            summary=f"Get all {job_name} jobs of the project",
        )

    # Get job by id
    def get_job_by_id(project_id: int, job_id: str):
        job = job_service.read_project_job(project_id, job_type, job_id)
        return JobReadModel.from_rq_job(job)

    router.add_api_route(
        f"{path}/{{job_id}}",
        get_job_by_id,
        name=f"get_{job_type}_job_by_id",
        methods=["GET"],
        response_model=JobReadModel,
        summary=f"Get {job_name} job",
    )

    if endpoint_generation != EndpointGeneration.ALL:
        return

    # Abort job
    def abort_job(project_id: int, job_id: str):
        job_service.read_project_job(project_id, job_type, job_id)
        return job_service.stop_job(job_id)

    router.add_api_route(
        f"{path}/{{job_id}}/abort",
        abort_job,
        name=f"abort_{job_type}_job",
        methods=["POST"],
        response_model=bool,
        summary=f"Abort {job_name} job",
    )

    # Retry job
    def retry_job(project_id: int, job_id: str, authz_user: AuthzUser = Depends()):
        job = job_service.read_project_job(project_id, job_type, job_id)
        # the input may not be valid anymore (e.g. its feature was disabled)
        validate = validate_retry or validate_input
        if validate is not None:
            validate(authz_user.db, job.job.kwargs["payload"])
        return job_service.retry_job(job_id)

    router.add_api_route(
        f"{path}/{{job_id}}/retry",
        retry_job,
        name=f"retry_{job_type}_job",
        methods=["POST"],
        response_model=bool,
        summary=f"Retry {job_name} job",
    )


for job_type, job_info in job_service.job_registry.items():
    register_job_endpoints(
        job_type=job_type,
        input_model=job_info["input_type"],
        read_model=job_info["read_model"],
        endpoint_generation=job_info["generate_endpoints"],
        validate_input=job_info["validate_input"],
        validate_retry=job_info["validate_retry"],
    )
