from datetime import datetime
from enum import Enum
from typing import Any, Literal

from lightning_fabric.plugins.precision.precision import _PRECISION_INPUT
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


class ClassifierAveraging(str, Enum):
    MICRO = "micro"
    MACRO = "macro"


class ClassifierBaseModelOption(BaseModel):
    value: str = Field(description="HuggingFace model name")
    label: str = Field(description="Display label for the model")


class ClassifierTrainingDefaults(BaseModel):
    adapter_name: str | None = Field(
        description="Default adapter to use, or null to train without an adapter"
    )
    freeze_base_model: bool = Field(
        description="Whether the pretrained base model is frozen by default"
    )
    epochs: int = Field(description="Default number of training epochs")
    batch_size: int = Field(description="Default training batch size")
    early_stopping: bool = Field(description="Whether early stopping is enabled")
    early_stopping_patience: int = Field(
        description="Default validation patience for early stopping"
    )
    train_test_split: float = Field(
        description="Default fraction of training data reserved for validation"
    )
    learning_rate: float = Field(description="Default learning rate")
    weight_decay: float = Field(description="Default weight decay")
    dropout: float = Field(description="Default dropout rate")
    chunk_size: int = Field(description="Default token chunk size")
    precision: _PRECISION_INPUT | None = Field(
        description="Default Lightning training precision"
    )
    averaging: ClassifierAveraging = Field(
        description="Default evaluation metric averaging strategy"
    )


class ClassifierInfo(BaseModel):
    weak_signal_threshold: float = Field(
        description="Signal percentage below which training signal is weak"
    )
    strong_signal_threshold: float = Field(
        description="Signal percentage above which training signal is strong"
    )
    transformer_models: list[ClassifierBaseModelOption] = Field(
        description="Selectable transformer base models (span & document classification)"
    )
    embedding_models: list[ClassifierBaseModelOption] = Field(
        description="Selectable embedding base models (sentence classification)"
    )
    training_params: ClassifierTrainingDefaults = Field(
        description="Backend-configured defaults for classifier training"
    )


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


# ----- DATASET STATISTICS DTOS -----


class ClassifierSignalStrength(str, Enum):
    WEAK = "weak"
    OK = "ok"
    STRONG = "strong"


class ClassifierDatasetStatisticsRequest(BaseModel):
    model: ClassifierModel = Field(
        description=(
            "Classifier type whose dataset construction should be inspected. "
            "Document classifiers use tags as classes, while sentence and span "
            "classifiers use codes and selected annotators."
        )
    )
    base_model_name: str = Field(
        min_length=1,
        description=(
            "Hugging Face base model selected for training. Span statistics use "
            "its tokenizer to align word annotations with model tokens; document "
            "and sentence statistics currently do not depend on it."
        ),
    )
    tag_ids: list[int] = Field(
        description="IDs of document tags that select the dataset's source documents"
    )
    user_ids: list[int] = Field(
        description=(
            "IDs of annotators whose annotations should be used for sentence and "
            "span classification; ignored for document classification"
        )
    )
    class_ids: list[int] = Field(
        description=(
            "Selected tag IDs for document classification or code IDs for sentence "
            "and span classification"
        )
    )
    merge_children_into_parent: bool = Field(
        default=False,
        description=(
            "Whether annotations of descendant codes should count toward their "
            "selected parent code; only applies to sentence and span classification"
        ),
    )


class ClassifierClassStatistics(BaseModel):
    class_id: int = Field(description="ID of the class (tag or code)")
    num_examples: int = Field(
        description="Number of examples for the class (annotations / tagged docs)"
    )
    num_units: int = Field(
        description="Number of units (tokens / sentences / documents) of the class"
    )
    unit_percentage: float = Field(
        description="Percentage of units of the class relative to all units"
    )


class ProblematicSdoc(BaseModel):
    sdoc_id: int = Field(description="ID of the source document")
    total_units: int = Field(
        description="Total number of units (tokens / sentences / documents)"
    )
    labeled_units: int = Field(description="Number of units with a non-O label")
    labeled_percentage: float = Field(
        description="Percentage of labeled units relative to all units of the document"
    )


class ClassifierDatasetStatistics(BaseModel):
    total_units: int = Field(
        description="Total number of units (tokens / sentences / documents) in the dataset"
    )
    labeled_units: int = Field(
        description="Number of units with a non-O label in the dataset"
    )
    signal_percentage: float = Field(
        description="Percentage of labeled units relative to all units (training signal)"
    )
    signal_strength: ClassifierSignalStrength = Field(
        description="Strength of the training signal derived from the signal percentage"
    )
    weak_signal_threshold: float = Field(
        description="Signal percentage below which the training signal is considered weak"
    )
    strong_signal_threshold: float = Field(
        description="Signal percentage above which the training signal is considered strong"
    )
    classes: list[ClassifierClassStatistics] = Field(
        description="Statistics per class (tag or code)"
    )
    problematic_sdocs: list[ProblematicSdoc] = Field(
        description="Documents with a low share of labeled units, sorted by severity"
    )
    unannotated_sdocs: list[int] = Field(
        description=(
            "IDs of tag-selected documents without a matching selected class. "
            "Span and sentence datasets exclude them; document datasets retain "
            "them as O examples"
        )
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


class ClassifierClassMetrics(BaseModel):
    class_id: int = Field(description="ID of the class (tag or code)")
    precision: float = Field(description="Precision score for the class")
    recall: float = Field(description="Recall score for the class")
    f1: float = Field(description="F1 score for the class")
    support: int = Field(description="Number of gold instances of the class")


class ClassifierEvaluationCreate(BaseModel):
    classifier_id: int = Field(description="ID of the Classifier")
    f1: float = Field(description="F1 score")
    precision: float = Field(description="Precision score")
    recall: float = Field(description="Recall score")
    accuracy: float = Field(description="Accuracy score")
    eval_data_stats: list[ClassifierData] = Field(
        description="Evaluation data statistics"
    )
    class_metrics: list[ClassifierClassMetrics] = Field(
        default_factory=list,
        description="Per-class evaluation metrics (empty for older evaluations)",
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
    freeze_base_model: bool = Field(
        description=(
            "Freeze the pretrained base model and train only the classifier layers"
        )
    )
    class_ids: list[int] = Field(
        description="List of class IDs to train on (tag or code)"
    )
    # training data
    user_ids: list[int] = Field(description="List of user IDs to train on")
    tag_ids: list[int] = Field(description="List of Tag IDs to train on")
    merge_children_into_parent: bool = Field(
        description="Merge child codes in parent code?"
    )
    # training settings
    epochs: int = Field(description="Number of epochs to train for")
    batch_size: int = Field(description="Batch size to use for training")
    early_stopping: bool = Field(description="Whether to use early stopping")
    early_stopping_patience: int = Field(
        ge=0,
        description="Number of validation epochs without improvement before stopping",
    )
    train_test_split: float = Field(
        gt=0.0,
        lt=1.0,
        description="Fraction of selected training data reserved for validation",
    )
    learning_rate: float = Field(description="Learning rate to use for training")
    weight_decay: float = Field(description="Weight decay to use for training")
    dropout: float = Field(description="Dropout rate to use in the model")
    chunk_size: int = Field(description="Slice long documents into chunks of size x")
    precision: _PRECISION_INPUT | None = Field(
        description="Precision, e.g. 32-true, 16-mixed, 16-true, bf16-true, bf16-mixed"
    )
    # evaluation settings
    averaging: ClassifierAveraging = Field(
        description="Averaging strategy for evaluation metrics (micro or macro)",
    )

    def get_train_params(self):
        return {
            "epochs": self.epochs,
            "batch_size": self.batch_size,
            "freeze_base_model": self.freeze_base_model,
            "early_stopping": self.early_stopping,
            "early_stopping_patience": self.early_stopping_patience,
            "train_test_split": self.train_test_split,
            "learning_rate": self.learning_rate,
            "weight_decay": self.weight_decay,
            "dropout": self.dropout,
            "averaging": self.averaging.value,
            # Persisted so that eval/inference can rebuild the exact same
            # tokenization window that was used during training.
            "chunk_size": self.chunk_size,
            "merge_children_into_parent": self.merge_children_into_parent,
        }


class ClassifierEvaluationParams(BaseModel):
    task_type: Literal[ClassifierTask.EVALUATION]
    classifier_id: int = Field(description="ID of the model to evaluate")
    tag_ids: list[int] = Field(description="List of Tag IDs to evaluate on")
    user_ids: list[int] = Field(
        description="User IDs whose annotations serve as gold labels"
    )
    averaging: ClassifierAveraging | None = Field(
        default=None,
        description="Averaging strategy for evaluation metrics. If None, the model's stored training setting is used.",
    )


class ClassifierInferenceParams(BaseModel):
    task_type: Literal[ClassifierTask.INFERENCE]
    classifier_id: int = Field(description="ID of the model to use for inference")
    sdoc_ids: list[int] = Field(
        description="List of SourceDocument IDs to apply the classifier on"
    )
    delete_existing_work: bool = Field(
        description="Delete existing span/sent annotations or tags before creating new ones"
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
    result_statistics: list[ClassifierData] = Field(
        description="Statistics of the inference results"
    )
    total_affected_docs: int = Field(
        description="Number of SourceDocuments successfully affected by the classifier"
    )


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
