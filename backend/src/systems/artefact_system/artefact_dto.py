from pydantic import BaseModel, Field

from common.languages_enum import Language
from systems.job_system.job_dto import JobInputBase


class ProcessingSettings(BaseModel):
    extract_images: bool = Field(
        description="Whether to extract images from the documents"
    )
    pages_per_chunk: int = Field(
        description="Number of pages to chunk the documents into"
    )
    language: Language = Field(description="Language of the documents: 'de', 'en', ...")
    model: str = Field(description="Large Language Model to use for processing")


class ProcessingJobInput(JobInputBase):
    settings: ProcessingSettings = Field(description="Processing settings")


class SdocProcessingJobInput(ProcessingJobInput):
    sdoc_id: int = Field(description="SDoc ID")


class ArtefactComputationJobInput(JobInputBase):
    artefacts: list[str] = Field(
        description="Values of the Artefacts to compute (Artefact), fixed at the request"
    )
    settings: ProcessingSettings = Field(
        description="The processing settings of the started steps"
    )
    computation_id: str = Field(
        description="ID of this computation; the job stops if the Project has no pending computation with this ID (the request rolled back)"
    )
    last_sdoc_id: int = Field(
        description="The highest SourceDocument ID of the Project at the request; later documents plan their steps on upload"
    )
