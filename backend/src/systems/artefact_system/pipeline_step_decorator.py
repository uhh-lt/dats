from typing import Callable, TypeVar

from common.doc_type_enum import DocType
from systems.artefact_system.artefact_registry import Artefact, artefact_registry
from systems.artefact_system.pipeline_graph import PipelineStep
from systems.job_system.job_service import JobService

HandlerT = TypeVar("HandlerT", bound=Callable)


def pipeline_step(
    *,
    requires: set[Artefact],
    produces: set[Artefact],
    doctypes: set[DocType],
) -> Callable[[HandlerT], HandlerT]:
    """
    Declare a job as a step of the document preprocessing pipeline. Written above
    the job's `@register_job`, as it reads the registered job.

    The step runs for documents of the `doctypes`, after the steps that produce
    the artefacts it `requires`, and it `produces` artefacts for the steps after it.
    The step is named like its job, and a run of the job computes the step.
    """

    def decorator(func: HandlerT) -> HandlerT:
        js = JobService()
        job_type = js.read_job_type(func)
        if not doctypes:
            raise ValueError(f"Pipeline step {job_type} declares no doctypes.")
        if js.job_registry[job_type]["enricher"] is None:
            raise ValueError(
                f"Job type {job_type} is a pipeline step, but has no enricher: the "
                "steps before it start it with a bare SdocProcessingJobInput, and "
                "the enricher loads the rest of its input from the stored data."
            )
        artefact_registry.register_step(
            job_type,
            PipelineStep(
                requires=frozenset(requires),
                produces=frozenset(produces),
                doctypes=frozenset(doctypes),
            ),
        )
        return func

    return decorator
