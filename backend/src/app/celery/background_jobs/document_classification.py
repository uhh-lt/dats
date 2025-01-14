from loguru import logger

from app.core.data.classification.document_classification_service import (
    ClassificationService,
)

cs: ClassificationService = ClassificationService()


def start_document_classification_job_(task_id: int, project_id):
    logger.info((f"Starting classification job with task id {task_id}",))
    cs.perform_dummy_classification(task_id=task_id, project_id=project_id)

    logger.info(f"Classification job {task_id} has finished.")
