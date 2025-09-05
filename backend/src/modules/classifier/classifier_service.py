import gc
from pathlib import Path

from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from modules.classifier.classifier_crud import crud_classifier
from modules.classifier.classifier_dto import (
    ClassifierJobInput,
    ClassifierJobOutput,
    ClassifierModel,
    ClassifierTask,
)
from modules.classifier.classifier_exceptions import UnsupportedClassifierJobError
from modules.classifier.classifier_orm import ClassifierORM
from modules.classifier.models.doc_class_model_service import (
    DocClassificationModelService,
)
from modules.classifier.models.sent_class_model_service import (
    SentClassificationModelService,
)
from modules.classifier.models.span_class_model_service import (
    SpanClassificationModelService,
)
from modules.classifier.models.text_class_model_service import (
    TextClassificationModelService,
)
from repos.filesystem_repo import FilesystemRepo
from systems.job_system.job_dto import Job


class ClassifierService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(ClassifierService, cls).__new__(cls)

    def _next_llm_job_step(self, job: Job, description: str) -> None:
        job.update(current_step=job.get_current_step() + 1, status_message=description)

    def _update_llm_job_description(self, job: Job, description: str) -> None:
        job.update(status_message=description)

    def delete_classifier_by_id(self, db: Session, classifier_id: int) -> ClassifierORM:
        # make sure that classifier exists
        db_obj = crud_classifier.read(db=db, id=classifier_id)

        # delete classifier from filesystem
        FilesystemRepo().remove_dir(Path(db_obj.path).parent)

        # delete classifier from db
        crud_classifier.delete(db=db, id=classifier_id)
        return db_obj

    def handle_classifier_job(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        import torch

        job.update(
            current_step=0,
            status_message="Started ClassifierJob!",
        )

        # free GPU memory before job starts
        gc.collect()
        torch.cuda.empty_cache()

        # get the correct classifier service
        tcs: TextClassificationModelService
        match payload.model_type:
            case ClassifierModel.DOCUMENT:
                tcs = DocClassificationModelService()
            case ClassifierModel.SENTENCE:
                tcs = SentClassificationModelService()
            case ClassifierModel.SPAN:
                tcs = SpanClassificationModelService()
            case _:
                raise UnsupportedClassifierJobError(  # type: ignore
                    payload.task_type, payload.model_type
                )

        # execute the correct function
        try:
            match payload.task_type:
                case ClassifierTask.TRAINING:
                    result = tcs.train(db, job, payload)
                case ClassifierTask.EVALUATION:
                    result = tcs.eval(db, job, payload)
                case ClassifierTask.INFERENCE:
                    result = tcs.infer(db, job, payload)
                case _:
                    raise UnsupportedClassifierJobError(  # type: ignore
                        payload.task_type, payload.model_type
                    )
        finally:
            # free the GPU memory after job is finished
            gc.collect()
            torch.cuda.empty_cache()

        job.update(
            current_step=len(job.get_steps()) - 1,
            status_message="Finished ClassifierJob successfully!",
        )

        return result
