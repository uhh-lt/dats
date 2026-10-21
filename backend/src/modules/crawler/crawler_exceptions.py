from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_400_BAD_REQUEST)
class NoDataToCrawlError(Exception):
    def __init__(self, what_msg: str):
        super().__init__(what_msg)
