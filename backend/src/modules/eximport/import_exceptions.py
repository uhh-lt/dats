from fastapi import status

from common.exception_handler import exception_handler
from modules.eximport.import_job_dto import ImportJobType


@exception_handler(status.HTTP_500_INTERNAL_SERVER_ERROR)
class ImportJobPreparationError(Exception):
    def __init__(self, cause: Exception) -> None:
        super().__init__(f"Cannot prepare and create the Import Job! {cause}")


@exception_handler(status.HTTP_500_INTERNAL_SERVER_ERROR)
class UnsupportedImportJobTypeError(Exception):
    def __init__(self, import_job_type: ImportJobType) -> None:
        super().__init__(f"ImportJobType {import_job_type} is not supported! ")
