from loguru import logger

from app.core.data.dto.export_job import ExportJobRead
from app.core.data.export.export_service import ExportService

exs: ExportService = ExportService()


def start_export_job_(export_job: ExportJobRead) -> None:
    logger.info(
        (
            f"Starting ExportJob {export_job.id}",
            f" with parameters:\n\t{export_job.parameters.model_dump_json(indent=2)}",
        )
    )
    exj_result = exs.start_export_job_sync(export_job_id=export_job.id)

    logger.info(
        f"ExportJob {export_job.id} has finished! Data can be downloaded at: {exj_result.results_url}"
    )
