from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class FolderMoveToNonNormalFolderError(Exception):
    """Raised when a folder is moved into a folder that is not of type NORMAL."""

    def __init__(self, target_folder_id: int) -> None:
        super().__init__(f"Target folder {target_folder_id} must be of type NORMAL!")


@exception_handler(status.HTTP_400_BAD_REQUEST)
class FolderMoveAcrossProjectsError(Exception):
    """Raised when a folder is moved into a folder of a different project."""

    def __init__(self, folder_id: int, target_folder_id: int) -> None:
        super().__init__(
            f"Cannot move folder {folder_id} to folder {target_folder_id} of a "
            "different project!"
        )


@exception_handler(status.HTTP_400_BAD_REQUEST)
class FolderMoveCycleError(Exception):
    """Raised when a folder is moved into itself or one of its descendants."""

    def __init__(self, folder_id: int, target_folder_id: int) -> None:
        super().__init__(
            f"Cannot move folder {folder_id} into itself or its descendants "
            f"(target folder {target_folder_id})!"
        )
