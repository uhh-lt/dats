from typing import Dict

from common.crud_enum import MemoCrud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.memo.memo_dto import (
    AttachedObjectType,
)
from fastapi import APIRouter, Depends
from modules.memo_generation.memo_generation_service import generate_memo_ollama
from repos.db.util import get_parent_project_id
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/memo_generation",
    dependencies=[Depends(get_current_user)],
    tags=["memo_generation"],
)


attachedObject2Crud: Dict[AttachedObjectType, MemoCrud] = {
    AttachedObjectType.document_tag: MemoCrud.DOCUMENT_TAG,
    AttachedObjectType.source_document: MemoCrud.SOURCE_DOCUMENT,
    AttachedObjectType.code: MemoCrud.CODE,
    AttachedObjectType.bbox_annotation: MemoCrud.BBOX_ANNOTATION,
    AttachedObjectType.span_annotation: MemoCrud.SPAN_ANNOTATION,
    AttachedObjectType.sentence_annotation: MemoCrud.SENTENCE_ANNOTATION,
    AttachedObjectType.span_group: MemoCrud.SPAN_GROUP,
    AttachedObjectType.project: MemoCrud.PROJECT,
}


@router.get(
    "/generate_suggestion/{attached_obj_type}/{attached_obj_id}",
    response_model=str,
    summary="Generates a 1–2 sentence memo suggestion using LLM based on the attached object",
)
def generate_memo_suggestion(
    *,
    db: Session = Depends(get_db_session),
    attached_obj_id: int,
    attached_obj_type: AttachedObjectType,
    authz_user: AuthzUser = Depends(),
) -> str:
    crud = attachedObject2Crud.get(attached_obj_type)
    if crud is None:
        raise ValueError("Invalid attached_object_type")

    attached_object = crud.value.read(db=db, id=attached_obj_id)
    proj_id = get_parent_project_id(attached_object)
    if proj_id is None:
        raise ValueError("Attached object has no project")

    authz_user.assert_in_project(project_id=proj_id)

    return generate_memo_ollama(attached_object, db)
