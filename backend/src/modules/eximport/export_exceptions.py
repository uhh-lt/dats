from fastapi import status

from common.exception_handler import exception_handler
from modules.eximport.export_job_dto import ExportJobType


@exception_handler(status.HTTP_500_INTERNAL_SERVER_ERROR)
class NoDataToExportError(Exception):
    def __init__(self, what_msg: str):
        super().__init__(what_msg)


@exception_handler(status.HTTP_400_BAD_REQUEST)
class UnsupportedExportJobTypeError(Exception):
    def __init__(self, export_job_type: ExportJobType) -> None:
        super().__init__(f"ExportJobType {export_job_type} is not supported! ")
