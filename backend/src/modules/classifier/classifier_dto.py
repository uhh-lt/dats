from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from repos.db.dto_base import UpdateDTOBase
from systems.job_system.job_dto import JobInputBase, JobOutputBase

# ----- GENERIC DTOS -----


class ClassifierModel(str, Enum):
    DOCUMENT = "document"
    SENTENCE = "sentence"
    SPAN = "span"


class ClassifierTask(str, Enum):
    TRAINING = "training"
    EVALUATION = "evaluation"
    INFERENCE = "inference"


class ClassifierLoss(BaseModel):
    step: int = Field(description="Training step")
    value: float = Field(description="Loss value")


class ClassifierData(BaseModel):
    class_id: int = Field(description="ID of the class (tag or code)")
    num_examples: int = Field(
        description="Number of examples for the class (tag or code)"
    )


class ClassifierDataset(ClassifierData):
    class_id: int = Field(description="ID of the class (tag or code)")
    num_examples: int = Field(
        description="Number of examples for the class (tag or code)"
    )
    data_ids: list[int] = Field(
        description="List of example IDs for the class (tag or code)"
    )


# ----- JOB DTOS -----


class ClassifierTrainingParams(BaseModel):
    task_type: Literal[ClassifierTask.TRAINING]
    classifier_name: str = Field(description="Name of the model to train")
    class_ids: list[int] = Field(
        description="List of class IDs to train on (tag or code)"
    )
    user_ids: list[int] = Field(description="List of user IDs to train on")
    sdoc_ids: list[int] = Field(description="List of SourceDocument IDs to train on")
    epochs: int = Field(description="Number of epochs to train for")
    batch_size: int = Field(description="Batch size to use for training")


class ClassifierEvaluationParams(BaseModel):
    task_type: Literal[ClassifierTask.EVALUATION]
    classifier_id: int = Field(description="ID of the model to evaluate")
    sdoc_ids: list[int] = Field(description="List of SourceDocument IDs to evaluate on")
    user_ids: list[int] = Field(
        description="User IDs whose annotations serve as gold labels"
    )


class ClassifierInferenceParams(BaseModel):
    task_type: Literal[ClassifierTask.INFERENCE]
    classifier_id: int = Field(description="ID of the model to use for inference")
    sdoc_ids: list[int] = Field(
        description="List of SourceDocument IDs to apply the classifier on"
    )


class ClassifierJobInput(JobInputBase):
    task_type: ClassifierTask = Field(description="The type of the Classifier Task")
    model_type: ClassifierModel = Field(description="The type of the Classifier Model")
    task_parameters: (
        ClassifierTrainingParams
        | ClassifierEvaluationParams
        | ClassifierInferenceParams
    ) = Field(
        description="Specific parameters for the ClassifierJob w.r.t it's type",
        discriminator="task_type",
    )


class ClassifierTrainingOutput(BaseModel):
    task_type: Literal[ClassifierTask.TRAINING]
    train_loss: list[ClassifierLoss] = Field(description="Training loss per step")
    train_data_stats: list[ClassifierData] = Field(
        description="Training data statistics"
    )


class ClassifierEvaluationOutput(BaseModel):
    task_type: Literal[ClassifierTask.EVALUATION]
    eval_loss: list[ClassifierLoss] = Field(description="Evaluation loss per step")
    eval_data_stats: list[ClassifierData] = Field(
        description="Evaluation data statistics"
    )
    f1: float = Field(description="F1 score")
    precision: float = Field(description="Precision score")
    recall: float = Field(description="Recall score")
    accuracy: float = Field(description="Accuracy score")


class ClassifierInferenceOutput(BaseModel):
    task_type: Literal[ClassifierTask.INFERENCE]


class ClassifierJobOutput(JobOutputBase):
    task_type: ClassifierTask = Field(description="The type of the ClassifierJob")
    task_output: (
        ClassifierTrainingOutput
        | ClassifierEvaluationOutput
        | ClassifierInferenceOutput
    ) = Field(
        description="Specific outputs for the ClassifierJob w.r.t it's type",
        discriminator="task_type",
    )


# ----- CRUD DTOS -----


class ClassifierCreate(BaseModel):
    project_id: int = Field(description="ID of the project this classifier belongs to")
    name: str = Field(description="Name of the classifier")
    type: ClassifierModel = Field(description="Type of the classifier")
    path: str = Field(description="Name of the classifier")
    class_ids: list[int] = Field(
        description="List of class IDs the classifier was trained with (tag or code)"
    )
    # TRAINING
    batch_size: int = Field(description="Batch size used for training")
    epochs: int = Field(description="Number of epochs for training")
    train_loss: list[ClassifierLoss] = Field(description="Training loss per step")
    train_data_stats: list[ClassifierData] = Field(description="Training data stats")


class ClassifierUpdate(BaseModel, UpdateDTOBase):
    name: str | None = Field(default=None, description="Updated name of the classifier")


class ClassifierEvaluationCreate(BaseModel):
    classifier_id: int = Field(description="ID of the Classifier")
    f1: float = Field(description="F1 score")
    precision: float = Field(description="Precision score")
    recall: float = Field(description="Recall score")
    accuracy: float = Field(description="Accuracy score")
    eval_loss: list[ClassifierLoss] = Field(description="Evaluation loss per step")
    eval_data_stats: list[ClassifierData] = Field(
        description="Evaluation data statistics"
    )


class ClassifierEvaluationRead(ClassifierEvaluationCreate):
    id: int = Field(description="ID of the Classifier Evaluation")
    created: datetime = Field(description="Creation timestamp of the classifier")

    model_config = ConfigDict(from_attributes=True)


class ClassifierRead(ClassifierCreate):
    id: int = Field(description="ID of the Classifier")
    created: datetime = Field(description="Creation timestamp of the classifier")
    updated: datetime = Field(description="Update timestamp of the classifier")

    evaluations: list[ClassifierEvaluationRead] = Field(
        description="List of evaluations for the classifier"
    )

    model_config = ConfigDict(from_attributes=True)
