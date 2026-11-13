from common.job_type_enum import JobType
from systems.artefact_system.artefact_exceptions import PipelineNotRegisteredError
from systems.artefact_system.pipeline_graph import PipelineGraph, PipelineStep


class ArtefactRegistry:
    """Collects the step declarations of `@pipeline_step` and builds the graph
    from them on first use."""

    def __init__(self) -> None:
        self._steps: dict[JobType, PipelineStep] = {}
        self._graph: PipelineGraph | None = None

    def register_step(self, job_type: JobType, step: PipelineStep) -> None:
        self._steps[job_type] = step
        self._graph = None

    def unregister_step(self, job_type: JobType) -> None:
        """Remove the steps of the job (the job's own step and its further steps)."""
        for step in [s for s, d in self._steps.items() if job_type in (s, d.job)]:
            del self._steps[step]
        self._graph = None

    def graph(self) -> PipelineGraph:
        if not self._steps:
            raise PipelineNotRegisteredError()
        if self._graph is None:
            self._graph = PipelineGraph(self._steps)
        return self._graph


artefact_registry = ArtefactRegistry()
