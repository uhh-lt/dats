from fastapi import status

from common.exception_handler import exception_handler
from common.feature_enum import Feature


class FeatureDeclarationError(Exception):
    """Raised at startup when the `register_feature` declarations are invalid
    (e.g. an unknown artefact, an unknown required feature or a cycle)."""

    def __init__(self, problems: list[str]) -> None:
        self.problems = problems
        super().__init__("Invalid feature declarations:\n- " + "\n- ".join(problems))


@exception_handler(status.HTTP_403_FORBIDDEN)
class FeatureDisabledError(Exception):
    """Raised when a disabled feature of a project is used."""

    def __init__(self, project_id: int, feature: Feature) -> None:
        super().__init__(
            f"The feature '{feature.value}' is not enabled in project {project_id}. "
            "Enable it in the project settings to use it."
        )


@exception_handler(status.HTTP_400_BAD_REQUEST)
class FeatureStillRequiredError(Exception):
    """Raised when a feature is disabled that another enabled feature requires."""

    def __init__(self, feature: Feature, required_by: list[Feature]) -> None:
        names = ", ".join(f"'{f.value}'" for f in required_by)
        super().__init__(
            f"The feature '{feature.value}' cannot be disabled: the enabled features "
            f"{names} require it. Disable them as well."
        )


@exception_handler(status.HTTP_409_CONFLICT)
class FeatureActivationPendingError(Exception):
    """Raised when a feature is enabled or completed while its activation runs."""

    def __init__(self, project_id: int, feature: Feature) -> None:
        super().__init__(
            f"The feature '{feature.value}' is being computed in project "
            f"{project_id}. Restart it to compute it with other settings."
        )
