from pathlib import Path
from typing import Dict

from pydantic import BaseModel, Field


class PreProDocBase(BaseModel):
    filename: str = Field(
        description=(
            "The name of the file including the extension."
            "This does not include not the full absolute path."
        )
    )

    filepath: Path = Field(
        description="The absolute path of the file in the project repository."
    )

    project_id: int = Field(
        description="The ID of the project the file is going to be imported to."
    )

    mime_type: str = Field(
        description=(
            "The MIME Type of the file."
            "This was determined from the UploadedFile object."
        )
    )

    metadata: Dict[str, str] = Field(
        description=(
            "A container to store all metadata generated during the preprocessing "
            "that will be persisted in the database."
        ),
        default_factory=dict,
    )
