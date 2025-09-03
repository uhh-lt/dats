from datetime import datetime
from enum import Enum
from typing import Any, Literal

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


# ----- CRUD DTOS -----


class ClassifierCreate(BaseModel):
    project_id: int = Field(description="ID of the project this classifier belongs to")
    name: str = Field(description="Name of the classifier")
    base_model: str = Field(description="Name of the base model")
    type: ClassifierModel = Field(description="Type of the classifier")
    path: str = Field(description="Name of the classifier")
    labelid2classid: dict[int, int] = Field(
        description="Mapping from internal model label id to code/tag id, depending on ClassifierModel."
    )
    # TRAINING
    train_params: dict[str, Any] = Field(description="Training parameters")
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

    class_ids: list[int] = Field(
        description="List of class IDs the classifier was trained with (tag or code)"
    )
    evaluations: list[ClassifierEvaluationRead] = Field(
        description="List of evaluations for the classifier"
    )

    model_config = ConfigDict(from_attributes=True)


# ----- JOB DTOS -----


class ClassifierTrainingParams(BaseModel):
    task_type: Literal[ClassifierTask.TRAINING]
    # required
    classifier_name: str = Field(description="Name of the model to train")
    base_name: str = Field(description="Name of the base model")
    adapter_name: str | None = Field(description="Name of the adapter to use (if any)")
    class_ids: list[int] = Field(
        description="List of class IDs to train on (tag or code)"
    )
    # training data
    user_ids: list[int] = Field(description="List of user IDs to train on")
    tag_ids: list[int] = Field(description="List of Tag IDs to train on")
    # training settings
    epochs: int = Field(description="Number of epochs to train for")
    batch_size: int = Field(description="Batch size to use for training")
    early_stopping: bool = Field(description="Whether to use early stopping")
    learning_rate: float = Field(description="Learning rate to use for training")
    weight_decay: float = Field(description="Weight decay to use for training")
    # specific training settings
    is_bio: bool = Field(description="Whether to use BIO or IO tagging")

    def get_train_params(self):
        return {
            "epochs": self.epochs,
            "batch_size": self.batch_size,
            "early_stopping": self.early_stopping,
            "learning_rate": self.learning_rate,
            "weight_decay": self.weight_decay,
            "is_bio": self.is_bio,
        }


class ClassifierEvaluationParams(BaseModel):
    task_type: Literal[ClassifierTask.EVALUATION]
    classifier_id: int = Field(description="ID of the model to evaluate")
    tag_ids: list[int] = Field(description="List of Tag IDs to evaluate on")
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
    classifier: ClassifierRead = Field(description="The trained Classifier")


class ClassifierEvaluationOutput(BaseModel):
    task_type: Literal[ClassifierTask.EVALUATION]
    evaluation: ClassifierEvaluationRead = Field(
        description="The Classifier Evaluation"
    )


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
