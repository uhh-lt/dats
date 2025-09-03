from abc import ABC, abstractmethod

from sqlalchemy.orm import Session

from modules.classifier.classifier_dto import (
    ClassifierJobInput,
    ClassifierJobOutput,
)
from systems.job_system.job_dto import Job


class TextClassificationModelService(ABC):
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
