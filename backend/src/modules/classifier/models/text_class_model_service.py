from abc import ABC, abstractmethod

from huggingface_hub import login
from loguru import logger
from sqlalchemy.orm import Session

from config import conf
from modules.classifier.classifier_dto import (
    ClassifierJobInput,
    ClassifierJobOutput,
)
from systems.job_system.job_dto import Job


class TextClassificationModelService(ABC):
    def __init__(self):
        login(conf.api.hf_hub_token)
        logger.info("Logged in to Hugging Face Hub!")

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
