from typing import Annotated, TypeAlias

from pydantic import Field

from schemas.dataset.document_classification_dataset_schema import (
    DocumentClassificationMultiLabelConfig,
    DocumentClassificationSingleLabelConfig,
)
from schemas.dataset.extractive_qa_dataset_schema import QADatasetConfig
from schemas.dataset.sequential_sentence_classification_dataset_schema import (
    SequentialSentenceClassificationConfig,
)
from schemas.dataset.span_classification_dataset_schema import SpanClassificationConfig
from schemas.dataset.template_filling_dataset_schema import TemplateFillingDatasetConfig

DatasetConfig: TypeAlias = Annotated[
    DocumentClassificationSingleLabelConfig
    | DocumentClassificationMultiLabelConfig
    | QADatasetConfig
    | SpanClassificationConfig
    | SequentialSentenceClassificationConfig
    | TemplateFillingDatasetConfig,
    Field(discriminator="dataset_type"),
]
