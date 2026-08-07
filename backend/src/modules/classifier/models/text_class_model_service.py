from abc import ABC, abstractmethod

from huggingface_hub import login
from loguru import logger
from sqlalchemy.orm import Session

from config import conf
from modules.classifier.classifier_dto import (
    ClassifierDatasetStatistics,
    ClassifierJobInput,
    ClassifierJobOutput,
)
from systems.job_system.job_dto import Job


class TextClassificationModelService(ABC):
    def __init__(self):
        login(conf.api.hf_hub_token)
        logger.info("Logged in to Hugging Face Hub!")

    @abstractmethod
    def compute_dataset_statistics(
        self,
        db: Session,
        project_id: int,
        tag_ids: list[int],
        user_ids: list[int],
        class_ids: list[int],
        merge_children_into_parent: bool,
        base_model_name: str,
    ) -> ClassifierDatasetStatistics:
        """Computes statistics of the dataset that would be built with the given
        parameters, using the exact same dataset-building code as training."""
        pass

    @abstractmethod
    def train(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        """Trains the model."""
        pass

    @abstractmethod
    def eval(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        """Evaluates the model."""
        pass

    @abstractmethod
    def infer(
        self, db: Session, job: Job, payload: ClassifierJobInput
    ) -> ClassifierJobOutput:
        """Performs inference with the model."""
        pass
