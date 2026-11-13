from fastapi import status

from common.common_exceptions import NotFoundError
from common.exception_handler import exception_handler
from common.feature_enum import FeatureAction, FeatureStatus


class FeatureDeclarationError(Exception):
    """Raised at startup when the `register_feature` declarations are invalid
    (e.g. an unknown artefact, an unknown required feature or a cycle)."""

    def __init__(self, problems: list[str]) -> None:
        self.problems = problems
        super().__init__("Invalid feature declarations:\n- " + "\n- ".join(problems))


@exception_handler(status.HTTP_403_FORBIDDEN)
class FeatureDisabledError(Exception):
    """Raised when a disabled feature of a project is used."""

    def __init__(self, project_id: int, feature: str) -> None:
        super().__init__(
            f"The feature '{feature}' is not enabled in project {project_id}. "
            "Enable it in the project settings to use it."
        )


@exception_handler(status.HTTP_400_BAD_REQUEST)
class FeatureStillRequiredError(Exception):
    """Raised when a feature is disabled that another enabled feature requires."""

    def __init__(self, feature: str, required_by: list[str]) -> None:
        names = ", ".join(f"'{f}'" for f in required_by)
        super().__init__(
            f"The feature '{feature}' cannot be disabled: the enabled features "
            f"{names} require it. Disable them as well."
        )


@exception_handler(status.HTTP_409_CONFLICT)
class FeatureActionNotAllowedError(Exception):
    """Raised when a feature action is not allowed in the feature's status."""

    def __init__(
        self,
        feature: str,
        action: FeatureAction,
        status: FeatureStatus,
        allowed: list[FeatureStatus],
    ) -> None:
        names = " or ".join(f"'{s.value}'" for s in allowed)
        super().__init__(
            f"Cannot {action.value} the feature '{feature}': it is "
            f"'{status.value}'. {action.value.capitalize()} is allowed only when it "
            f"is {names}."
        )


class FeatureNotFoundError(NotFoundError):
    """Raised when a request names a feature that is not registered (404)."""

    def __init__(self, name: str) -> None:
        super().__init__(f"There is no feature '{name}'.")
