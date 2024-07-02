from loguru import logger

from app.core.data.dto.import_job import ImportJobRead
from app.core.data.import_.import_service import ImportService

ims: ImportService = ImportService()


def start_import_code_job_(import_job: ImportJobRead) -> None:
    logger.info(
        (
            f"Starting ImportJob {import_job.id}",
            f" with parameters:\n\t{import_job.parameters.model_dump_json(indent=2)}",
        )
    )
    ims.start_import_codes_sync(import_job_id=import_job.id)

    logger.info(f"ImportJob {import_job.id} has finished!")
