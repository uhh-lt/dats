from typing import Type

from core.auth.authz_user import AuthzUser
from fastapi import APIRouter, Depends
from pydantic import BaseModel, create_model
from systems.job_system.job_dto import EndpointGeneration, JobInputBase, JobRead
from systems.job_system.job_service import JobService

router = APIRouter(prefix="/job", tags=["job"])


job_service = JobService()


def register_job_endpoints(
    job_type: str,
    input_model: Type[JobInputBase],
    output_model: Type[BaseModel] | None,
    endpoint_generation: EndpointGeneration,
    router: APIRouter,
):
    if endpoint_generation == EndpointGeneration.NONE:
        return

    job_name = "".join([x.capitalize() for x in job_type.split("_")])

    # Dynamically create a concrete JobRead model using create_model and JobRead as base
    JobReadModel = create_model(
        f"{job_name}JobRead",
        __base__=JobRead[input_model, output_model],
    )

    # Start job
    async def start_job(
        payload: input_model,  # type: ignore
        authz_user: AuthzUser = Depends(),
    ):
        authz_user.assert_in_project(payload.project_id)
        job = job_service.start_job(job_type=job_type, payload=payload)
        return JobReadModel.from_rq_job(job)

    router.add_api_route(
        f"/{job_type}",
        start_job,
        name=f"start_{job_type}_job",
        methods=["POST"],
        response_model=JobReadModel,
        summary=f"Start {job_name} job",
    )

    # Get job by id
    async def get_job_by_id(
        job_id: str,
        authz_user: AuthzUser = Depends(),
    ):
        job = job_service.get_job(job_id)
        authz_user.assert_in_project(job.get_project_id())
        return JobReadModel.from_rq_job(job)

    router.add_api_route(
        f"/{job_type}/{{job_id}}",
        get_job_by_id,
        name=f"get_{job_type}_job_by_id",
        methods=["GET"],
        response_model=JobReadModel,
        summary=f"Get {job_name} job",
    )

    if endpoint_generation == EndpointGeneration.ALL:
        # Abort job
        async def abort_job(job_id: str, authz_user: AuthzUser = Depends()):
            job = job_service.get_job(job_id)
            authz_user.assert_in_project(job.get_project_id())
            return job_service.stop_job(job_id)

        router.add_api_route(
            f"/{job_type}/{{job_id}}/abort",
            abort_job,
            name=f"abort_{job_type}_job",
            methods=["POST"],
            response_model=bool,
            summary=f"Abort {job_name} job",
        )

        # Retry job
        async def retry_job(job_id: str, authz_user: AuthzUser = Depends()):
            job = job_service.get_job(job_id)
            authz_user.assert_in_project(job.get_project_id())
            return job_service.retry_job(job_id)

        router.add_api_route(
            f"/{job_type}/{{job_id}}/retry",
            retry_job,
            name=f"retry_{job_type}_job",
            methods=["POST"],
            response_model=bool,
            summary=f"Retry {job_name} job",
        )

        # Get all jobs by project
        async def get_jobs_by_project(
            project_id: int, authz_user: AuthzUser = Depends()
        ):
            authz_user.assert_in_project(project_id)
            jobs = job_service.get_jobs_by_project(job_type, project_id)
            jobs.sort(key=lambda x: x.get_created(), reverse=True)
            return [JobReadModel.from_rq_job(job) for job in jobs]

        router.add_api_route(
            f"/{job_type}/project/{{project_id}}",
            get_jobs_by_project,
            name=f"get_{job_type}_jobs_by_project",
            methods=["GET"],
            response_model=list[JobReadModel],
            summary=f"Get all {job_name} jobs by project",
        )


for job_type, job_info in job_service.job_registry.items():
    register_job_endpoints(
        job_type=job_type,
        input_model=job_info["input_type"],
        output_model=job_info["output_type"],
        endpoint_generation=job_info["generate_endpoints"],
        router=job_info["router"] or router,
    )
