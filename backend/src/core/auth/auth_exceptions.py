from fastapi import HTTPException, status

from common.exception_handler import exception_handler

credentials_exception = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


@exception_handler(status.HTTP_403_FORBIDDEN)
class ForbiddenError(Exception):
    def __init__(self):
        super().__init__("User is not authorized")


@exception_handler(status.HTTP_400_BAD_REQUEST)
class InvalidError(Exception):
    def __init__(self, note=None):
        note_description = f": {note}" if note is not None else ""
        super().__init__(f"Invalid Request{note_description}")
