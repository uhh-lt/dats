class PipelineDeclarationError(Exception):
    """Raised at startup when the `@pipeline_step` declarations of
    the pipeline steps do not form a valid pipeline (e.g. an artefact nobody
    produces, or a cycle)."""

    def __init__(self, problems: list[str]) -> None:
        self.problems = problems
        super().__init__(
            "Invalid preprocessing pipeline declarations:\n- " + "\n- ".join(problems)
        )


class PipelineNotRegisteredError(Exception):
    """Raised when the pipeline graph is read before the jobs were registered."""

    def __init__(self) -> None:
        super().__init__(
            "No pipeline steps are registered. Register the jobs first "
            "(bootstrap.register_jobs)."
        )


class ForeignArtefactDataError(Exception):
    """Raised when data is written through the store of an artefact that does
    not own it (a document data column, a metadata key or an annotation code of
    another artefact)."""

    def __init__(self, foreign: list[str]) -> None:
        super().__init__(
            "The store of the artefact does not own: " + ", ".join(foreign) + "."
        )
