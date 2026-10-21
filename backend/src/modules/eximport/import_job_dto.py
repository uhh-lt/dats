from typing import Literal

from pydantic import Field

from modules.eximport.import_enum import ImportJobType
from systems.job_system.job_dto import JobInputBase, JobRead


class ImportJobInput(JobInputBase):
    import_job_type: ImportJobType = Field(
        description="The type of the import job (what to import)"
    )
    user_id: int = Field(description="ID of the User, who started the job.")
    file_name: str = Field(
        description="The name to the file that is used for the import job"
    )


class ImportJobRead(JobRead[ImportJobInput, None]):
    job_type: Literal["import"] = Field(
        description="Type of the job", json_schema_extra={"enum": ["import"]}
    )
