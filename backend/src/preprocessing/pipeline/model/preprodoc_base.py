from datetime import datetime
from pathlib import Path
from typing import Dict, List, Union

from core.doc.source_document_link_dto import SourceDocumentLinkCreate
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

    metadata: Dict[str, Union[str, List[str], bool, int, datetime]] = Field(
        description=(
            "A container to store all metadata generated during the preprocessing "
            "that will be persisted in the database."
        ),
        default_factory=dict,
    )

    sdoc_link_create_dtos: List[SourceDocumentLinkCreate] = Field(
        description="A list of sdoc link create dtos that is used by every import pipeline to import sdoc links.",
        default_factory=list,
    )

    tags: List[int] = Field(
        description="A list of tag ids that is used by every import pipeline to import tags on sdocs.",
        default_factory=list,
    )
