from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class InvalidSearchViewOrderError(Exception):
    pass
