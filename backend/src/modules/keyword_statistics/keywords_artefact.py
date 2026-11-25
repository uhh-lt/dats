"""The keywords of a document, carried by its project metadata key "keywords",
which the feature Keyword Statistics sets up (`create_keywords_metadata`)."""

from sqlalchemy.orm import Session

from common.doc_type_enum import DocType
from common.meta_type_enum import MetaType
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataCreate
from systems.artefact_system.artefact_registry import artefact

KEYWORDS = artefact("keywords", title="Keywords")

KEYWORDS_METADATA_KEY = "keywords"
_DESCRIPTIONS = {
    DocType.text: "Keywords extracted from the document",
    DocType.image: "Keywords extracted from the image's caption",
    DocType.audio: "Keywords extracted from the transcript",
    DocType.video: "Keywords extracted from the transcript",
}


def create_keywords_metadata(
    db: Session, project_id: int, doctypes: list[DocType] | None = None
) -> None:
    """Create the read-only project metadata key "keywords" (a list) for the
    doctypes (all with keywords if None) that have no key of this name yet,
    with an empty value for each existing document. Safe to run twice."""
    existing = {
        DocType(pm.doctype)
        for pm in crud_project_meta.read_by_project_and_key(
            db=db, project_id=project_id, key=KEYWORDS_METADATA_KEY
        )
    }
    missing = [d for d in doctypes or list(_DESCRIPTIONS) if d not in existing]
    if not missing:
        return
    crud_project_meta.create_multi(
        db=db,
        project_id=project_id,
        create_dtos=[
            ProjectMetadataCreate(
                key=KEYWORDS_METADATA_KEY,
                metatype=MetaType.LIST,
                read_only=True,
                doctype=doctype,
                description=_DESCRIPTIONS[doctype],
            )
            for doctype in missing
        ],
    )
