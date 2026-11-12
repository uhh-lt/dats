from typing import Callable, TypeVar

from common.artefact_enum import Artefact
from common.doc_type_enum import DocType
from common.job_type_enum import JobType
from modules.doc_processing.pipeline.pipeline_graph import (
    PipelineStep,
    pipeline_registry,
)
from systems.job_system.job_service import JobService

HandlerT = TypeVar("HandlerT", bound=Callable)


def pipeline_step(
    *,
    requires: set[Artefact],
    produces: set[Artefact],
    doctypes: set[DocType],
    further_steps: dict[JobType, set[Artefact]] | None = None,
) -> Callable[[HandlerT], HandlerT]:
    """
    Declare a job as a step of the document preprocessing pipeline. Written above
    the job's `@register_job`, as it reads the registered job.

    The step runs for documents of the `doctypes`, after the steps that produce
    the artefacts it `requires`, and it `produces` artefacts for the steps after it.

    `further_steps` are more steps the job computes in the same run, each with its
    own status and the artefacts it produces, and the job's `requires` and
    `doctypes`. The job input (`SdocProcessingJobInput.steps`) says which of the
    job's steps to compute, so each can be planned and recomputed on its own.
    """

    def decorator(func: HandlerT) -> HandlerT:
        js = JobService()
        job_type = js.read_job_type(func)
        if not doctypes:
            raise ValueError(f"Pipeline step {job_type} declares no doctypes.")
        if js.job_registry[job_type]["enricher"] is None:
            raise ValueError(
                f"JobType {job_type} is a pipeline step, but has no enricher: the "
                "steps before it start it with a bare SdocProcessingJobInput, and "
                "the enricher loads the rest of its input from the stored data."
            )
        pipeline_registry.register(
            job_type,
            PipelineStep(
                requires=frozenset(requires),
                produces=frozenset(produces),
                doctypes=frozenset(doctypes),
            ),
        )
        for step, step_produces in (further_steps or {}).items():
            pipeline_registry.register(
                step,
                PipelineStep(
                    requires=frozenset(requires),
                    produces=frozenset(step_produces),
                    doctypes=frozenset(doctypes),
                    job=job_type,
                ),
            )
        return func

    return decorator
