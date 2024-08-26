from loguru import logger

from app.core.data.dto.llm_job import LLMJobRead
from app.core.data.llm.llm_service import LLMService

llms: LLMService = LLMService()


def start_llm_job_(llm_job: LLMJobRead) -> None:
    logger.info(
        (
            f"Starting LLMJob {llm_job.id}",
            f" with parameters:\n\t{llm_job.parameters.model_dump_json(indent=2)}",
        )
    )
    llms.start_llm_job_sync(llm_job_id=llm_job.id)

    logger.info(f"LLMJob {llm_job.id} has finished!")
