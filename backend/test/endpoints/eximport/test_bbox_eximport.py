from uuid import uuid4

from sqlalchemy.orm import Session

from core.annotation.bbox_annotation_crud import crud_bbox_anno
from modules.eximport.bbox_annotations.bbox_annotations_export_schema import (
    BBoxAnnotationExportCollection,
    BBoxAnnotationExportSchema,
)
from modules.eximport.bbox_annotations.import_bbox_annotations import (
    import_bbox_annotations_to_proj,
)

from .conftest import PersonBoxProject

# ===========================================================================
# IMPORT BBOX ANNOTATIONS (modules/eximport/bbox_annotations) TESTS
# ===========================================================================


def _box(
    project: PersonBoxProject, email: str, code_name: str
) -> BBoxAnnotationExportSchema:
    return BBoxAnnotationExportSchema(
        uuid=str(uuid4()),
        sdoc_name=project["image"].filename,
        user_email=email,
        code_name=code_name,
        bbox_x_min=0,
        bbox_x_max=10,
        bbox_y_min=0,
        bbox_y_max=10,
    )


def test_import_moves_the_system_users_person_boxes_of_an_old_archive_to_human(
    db_session: Session, person_box_project: PersonBoxProject
):
    """An archive from before the code HUMAN marks the people object detection
    found as PERSON boxes of the system user: they are imported as HUMAN boxes,
    while a PERSON box of a user stays a PERSON box."""
    p = person_box_project
    boxes = [
        _box(p, p["system_user"].email, "PERSON"),
        _box(p, p["user"].email, "PERSON"),
    ]
    df = BBoxAnnotationExportCollection(annotations=boxes).to_dataframe()

    ids = import_bbox_annotations_to_proj(
        db=db_session, df=df, project_id=p["project"].id
    )
    db_session.commit()

    codes = {
        crud_bbox_anno.read(db=db_session, id=box_id).user_id: crud_bbox_anno.read(
            db=db_session, id=box_id
        ).code.name
        for box_id in ids
    }
    assert codes == {p["system_user"].id: "HUMAN", p["user"].id: "PERSON"}
