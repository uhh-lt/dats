from fastapi import status

from common.exception_handler import exception_handler


@exception_handler(status.HTTP_500_INTERNAL_SERVER_ERROR)
class SourceDocumentPreprocessingUnfinishedError(Exception):
    def __init__(self, sdoc_id: int):
        super().__init__(f"SourceDocument {sdoc_id} is still getting preprocessed!")
