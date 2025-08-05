from enum import Enum

from pydantic import Field
from systems.job_system.job_dto import JobInputBase, JobRead


class ImportJobType(str, Enum):
    PROJECT = "PROJECT"
    CODES = "CODES"
    TAGS = "TAGS"
    BBOX_ANNOTATIONS = "BBOX_ANNOTATIONS"
    SPAN_ANNOTATIONS = "SPAN_ANNOTATIONS"
    SENTENCE_ANNOTATIONS = "SENTENCE_ANNOTATIONS"
    USERS = "USERS"
    PROJECT_METADATA = "PROJECT_METADATA"
    WHITEBOARDS = "WHITEBOARDS"
    TIMELINE_ANALYSES = "TIMELINE_ANALYSES"
    COTA = "COTA"
    MEMOS = "MEMOS"
    DOCUMENTS = "DOCUMENTS"


class ImportJobInput(JobInputBase):
    import_job_type: ImportJobType = Field(
        description="The type of the import job (what to import)"
    )
    user_id: int = Field(description="ID of the User, who started the job.")
    file_name: str = Field(
        description="The name to the file that is used for the import job"
    )


ImportJobRead = JobRead[ImportJobInput, None]
