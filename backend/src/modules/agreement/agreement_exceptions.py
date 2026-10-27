from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class AgreementSdocsNotInProjectError(Exception):
    """Raised when an agreement evaluation references documents of another project."""

    def __init__(self, project_id: int, sdoc_ids: list[int]) -> None:
        super().__init__(
            f"The documents {sdoc_ids} do not belong to project {project_id}!"
        )


@exception_handler(status.HTTP_400_BAD_REQUEST)
class AgreementCodesNotInProjectError(Exception):
    """Raised when an agreement evaluation references codes of another project."""

    def __init__(self, project_id: int, code_ids: list[int]) -> None:
        super().__init__(f"The codes {code_ids} do not belong to project {project_id}!")


@exception_handler(status.HTTP_400_BAD_REQUEST)
class AgreementAnnotatorsNotInProjectError(Exception):
    """Raised when an agreement evaluation references annotators outside the project."""

    def __init__(self, project_id: int, user_ids: list[int]) -> None:
        super().__init__(
            f"The annotators {user_ids} are no members of project {project_id}!"
        )
