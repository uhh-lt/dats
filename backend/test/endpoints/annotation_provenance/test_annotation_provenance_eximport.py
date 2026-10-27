from collections.abc import Callable
from pathlib import Path

import pandas as pd
import pytest
from sqlalchemy.orm import Session

from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.span_annotation_crud import crud_span_anno
from modules.eximport.bbox_annotations.export_bbox_annotations import (
    export_selected_bbox_annotations,
)
from modules.eximport.bbox_annotations.import_bbox_annotations import (
    import_bbox_annotations_to_proj,
)
from modules.eximport.sent_annotations.export_sentence_annotations import (
    export_selected_sentence_annotations,
)
from modules.eximport.sent_annotations.import_sentence_annotations import (
    import_sentence_annotations_to_proj,
)
from modules.eximport.span_annotations.export_span_annotations import (
    export_selected_span_annotations,
)
from modules.eximport.span_annotations.import_span_annotations import (
    import_span_annotations_to_proj,
)
from repos.filesystem_repo import FilesystemRepo

from .provenance_utils import ANNOTATION_KINDS, AnnotationKind

CRUD = {
    "span": crud_span_anno,
    "sentence": crud_sentence_anno,
    "bbox": crud_bbox_anno,
}


def _export(db: Session, kind: AnnotationKind, project_id: int, ids: list[int]) -> Path:
    fsr = FilesystemRepo()
    match kind:
        case "span":
            return export_selected_span_annotations(
                db=db, fsr=fsr, project_id=project_id, span_annotation_ids=ids
            )
        case "sentence":
            return export_selected_sentence_annotations(
                db=db, fsr=fsr, project_id=project_id, sentence_annotation_ids=ids
            )
        case "bbox":
            return export_selected_bbox_annotations(
                db=db, fsr=fsr, project_id=project_id, bbox_annotation_ids=ids
            )


IMPORT: dict[AnnotationKind, Callable[..., list[int]]] = {
    "span": import_span_annotations_to_proj,
    "sentence": import_sentence_annotations_to_proj,
    "bbox": import_bbox_annotations_to_proj,
}

# ===========================================================================
# EXPORT / IMPORT OF ANNOTATIONS (modules/eximport) TESTS
# ===========================================================================
# The export and import endpoints run as background jobs, so these tests call the
# export and import functions of the jobs directly.


def _export_and_delete_copy(
    db_session: Session, kind: AnnotationKind, project
) -> tuple[pd.DataFrame, str]:
    """Export only the copy (not its source), delete the copy and return the
    exported rows and the copy's uuid."""
    crud = CRUD[kind]
    copy = crud.read(db=db_session, id=project[f"{kind}_copies"]["copy_id"])
    copy_uuid = copy.uuid
    path = _export(db_session, kind, project["project"].id, [copy.id])
    crud.delete(db=db_session, id=copy.id)
    db_session.commit()
    return pd.read_csv(path), copy_uuid


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_export_writes_provenance_by_uuid_email_and_name(
    db_session: Session, provenance_project_with_copies, kind: AnnotationKind
) -> None:
    """The export references the source annotation by uuid, its user by email and its
    code by name (ids differ between projects); an own annotation has none."""
    project = provenance_project_with_copies
    crud = CRUD[kind]
    copy_id = project[f"{kind}_copies"]["copy_id"]
    own_id = project[f"{kind}_copies"]["own_id"]
    source = crud.read(db=db_session, id=project[kind]["source_id"])

    path = _export(db_session, kind, project["project"].id, [copy_id, own_id])

    df = pd.read_csv(path).astype(object).where(lambda frame: frame.notna(), None)
    rows = df[
        ["source_annotation_uuid", "source_user_email", "source_code_name"]
    ].values.tolist()
    assert rows == [
        [source.uuid, project["assistant"].email, project["code_a"].name],
        [None, None, None],
    ]


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_import_restores_provenance_of_copy(
    db_session: Session, provenance_project_with_copies, kind: AnnotationKind
) -> None:
    """Re-importing an exported copy restores its source annotation (remapped by
    uuid), source user and source code."""
    project = provenance_project_with_copies
    df, copy_uuid = _export_and_delete_copy(db_session, kind, project)

    IMPORT[kind](db=db_session, df=df, project_id=project["project"].id)
    db_session.commit()

    imported = CRUD[kind].read_by_project_and_uuid(
        db=db_session, project_id=project["project"].id, uuid=copy_uuid
    )
    assert imported is not None
    assert imported.source_annotation_id == project[kind]["source_id"]
    assert imported.source_user_id == project["assistant"].id
    assert imported.source_code_id == project["code_a"].id


@pytest.mark.parametrize("kind", ANNOTATION_KINDS)
def test_import_drops_provenance_of_unknown_source_user(
    db_session: Session, provenance_project_with_copies, kind: AnnotationKind
) -> None:
    """A source user that does not exist (e.g. in another instance) is dropped
    instead of failing the import; the rest of the provenance is kept."""
    project = provenance_project_with_copies
    df, copy_uuid = _export_and_delete_copy(db_session, kind, project)
    df["source_user_email"] = "unknown@dats.org"

    IMPORT[kind](db=db_session, df=df, project_id=project["project"].id)
    db_session.commit()

    imported = CRUD[kind].read_by_project_and_uuid(
        db=db_session, project_id=project["project"].id, uuid=copy_uuid
    )
    assert imported is not None
    assert imported.source_annotation_id == project[kind]["source_id"]
    assert imported.source_user_id is None
    assert imported.source_code_id == project["code_a"].id
