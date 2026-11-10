class PipelineDeclarationError(Exception):
    """Raised at startup when the `requires`/`produces`/`doctypes` declarations of
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
