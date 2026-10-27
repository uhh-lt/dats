from collections.abc import Sequence
from typing import Protocol

from loguru import logger
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.annotation.bbox_annotation_orm import BBoxAnnotationORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.code.code_crud import crud_code
from core.user.user_crud import crud_user

AnnotationORM = SpanAnnotationORM | SentenceAnnotationORM | BBoxAnnotationORM


class AnnotationCRUD(Protocol):
    """The reads of crud_span_anno, crud_sentence_anno and crud_bbox_anno used here."""

    def read_by_ids(
        self, db: Session, *, ids: list[int]
    ) -> Sequence[AnnotationORM]: ...

    def read_by_project_and_uuid(
        self, db: Session, *, project_id: int, uuid: str
    ) -> AnnotationORM | None: ...


class AnnotationProvenanceExportSchema(BaseModel):
    """
    Provenance of an annotation copied from another annotation, for export/import.
    Ids differ between projects, so the source is referenced by uuid, its user by
    email and its code by name.
    """

    source_annotation_uuid: str | None = Field(
        description="UUID of the annotation this one was copied from", default=None
    )
    source_user_email: str | None = Field(
        description="Email of the user of the annotation this one was copied from",
        default=None,
    )
    source_code_name: str | None = Field(
        description="Name of the code of the copied annotation at copy time",
        default=None,
    )


def export_annotation_provenance(
    db: Session,
    *,
    crud: AnnotationCRUD,
    annotations: Sequence[AnnotationORM],
) -> list[AnnotationProvenanceExportSchema]:
    """
    Resolve the provenance of annotations for the export, with a constant number of
    queries.

    Args:
        crud: The CRUD of the annotations' type.
        annotations: The exported annotations.

    Returns:
        The provenance of every annotation, in the order of `annotations`.
    """
    # 1) the uuids of the source annotations (most are exported themselves)
    uuid_by_id = {annotation.id: annotation.uuid for annotation in annotations}
    missing_source_ids = list(
        dict.fromkeys(
            annotation.source_annotation_id
            for annotation in annotations
            if annotation.source_annotation_id is not None
            and annotation.source_annotation_id not in uuid_by_id
        )
    )
    uuid_by_id.update(
        {
            source.id: source.uuid
            for source in crud.read_by_ids(db=db, ids=missing_source_ids)
        }
    )

    # 2) the emails of the source users and the names of the source codes
    user_ids = list(
        dict.fromkeys(
            annotation.source_user_id
            for annotation in annotations
            if annotation.source_user_id is not None
        )
    )
    email_by_user_id = {
        user.id: user.email for user in crud_user.read_by_ids(db=db, ids=user_ids)
    }
    code_ids = list(
        dict.fromkeys(
            annotation.source_code_id
            for annotation in annotations
            if annotation.source_code_id is not None
        )
    )
    name_by_code_id = {
        code.id: code.name for code in crud_code.read_by_ids(db=db, ids=code_ids)
    }

    return [
        AnnotationProvenanceExportSchema(
            source_annotation_uuid=(
                uuid_by_id[annotation.source_annotation_id]
                if annotation.source_annotation_id is not None
                else None
            ),
            source_user_email=(
                email_by_user_id[annotation.source_user_id]
                if annotation.source_user_id is not None
                else None
            ),
            source_code_name=(
                name_by_code_id[annotation.source_code_id]
                if annotation.source_code_id is not None
                else None
            ),
        )
        for annotation in annotations
    ]


def import_annotation_provenance(
    db: Session,
    *,
    crud: AnnotationCRUD,
    project_id: int,
    provenances: Sequence[AnnotationProvenanceExportSchema],
    annotations: Sequence[AnnotationORM],
) -> None:
    """
    Set the provenance of imported annotations. Provenance is for transparency only,
    so a source annotation, user or code that does not exist (e.g. in another
    instance) is dropped with a warning instead of failing the import.

    Args:
        crud: The CRUD of the annotations' type.
        project_id: The project the annotations were imported into.
        provenances: The imported provenance, parallel to `annotations`.
        annotations: The imported annotations.
    """
    if not any(
        provenance.source_annotation_uuid
        or provenance.source_user_email
        or provenance.source_code_name
        for provenance in provenances
    ):
        return

    # 1) source annotations: imported together with their copies, or already there
    id_by_uuid = {annotation.uuid: annotation.id for annotation in annotations}
    for uuid in dict.fromkeys(
        provenance.source_annotation_uuid
        for provenance in provenances
        if provenance.source_annotation_uuid is not None
    ):
        if uuid in id_by_uuid:
            continue
        source = crud.read_by_project_and_uuid(db=db, project_id=project_id, uuid=uuid)
        if source is not None:
            id_by_uuid[uuid] = source.id

    # 2) source users by email, source codes by name
    user_id_by_email = {
        user.email: user.id
        for user in crud_user.read_by_emails(
            db=db,
            emails=list(
                dict.fromkeys(
                    provenance.source_user_email
                    for provenance in provenances
                    if provenance.source_user_email is not None
                )
            ),
        )
    }
    code_id_by_name = {
        code.name: code.id
        for code in crud_code.read_by_names(
            db=db,
            project_id=project_id,
            names=list(
                dict.fromkeys(
                    provenance.source_code_name
                    for provenance in provenances
                    if provenance.source_code_name is not None
                )
            ),
        )
    }

    # 3) set the provenance of the annotations
    dropped: set[str] = set()
    for provenance, annotation in zip(provenances, annotations, strict=True):
        if provenance.source_annotation_uuid is not None:
            annotation.source_annotation_id = id_by_uuid.get(
                provenance.source_annotation_uuid
            )
            if annotation.source_annotation_id is None:
                dropped.add(f"annotation {provenance.source_annotation_uuid}")
        if provenance.source_user_email is not None:
            annotation.source_user_id = user_id_by_email.get(
                provenance.source_user_email
            )
            if annotation.source_user_id is None:
                dropped.add(f"user {provenance.source_user_email}")
        if provenance.source_code_name is not None:
            annotation.source_code_id = code_id_by_name.get(provenance.source_code_name)
            if annotation.source_code_id is None:
                dropped.add(f"code {provenance.source_code_name}")
    db.flush()

    if dropped:
        logger.warning(
            "Dropped the provenance of imported annotations whose source does not "
            f"exist in project {project_id}: {', '.join(sorted(dropped))}"
        )
