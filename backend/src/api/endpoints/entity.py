from itertools import chain
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.entity import crud_entity
from app.core.data.crud.span_text import crud_span_text
from app.core.data.dto.entity import (
    EntityCreate,
    EntityMerge,
    EntityRead,
    EntityRelease,
    EntityUpdate,
)

router = APIRouter(
    prefix="/entity", dependencies=[Depends(get_current_user)], tags=["entity"]
)


@router.patch(
    "/{entity_id}",
    response_model=EntityRead,
    summary="Updates the Entity with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    entity_id: int,
    entity: EntityUpdate,
    authz_user: AuthzUser = Depends(),
) -> EntityRead:
    authz_user.assert_in_same_project_as(Crud.ENTITY, entity_id)
    entity.is_human = True
    db_obj = crud_entity.update(db=db, id=entity_id, update_dto=entity)
    return EntityRead.model_validate(db_obj)


# add merge endpoint
@router.put(
    "/merge",
    response_model=EntityRead,
    summary="Merges entities and/or span texts with given IDs.",
)
def merge_entities(
    *,
    db: Session = Depends(get_db_session),
    entity_merge: EntityMerge,
    authz_user: AuthzUser = Depends(),
) -> EntityRead:
    authz_user.assert_in_same_project_as_many(Crud.ENTITY, entity_merge.entity_ids)
    all_span_texts = (
        list(
            chain.from_iterable(
                [st.id for st in crud_entity.read(db=db, id=id).span_texts]
                for id in entity_merge.entity_ids
            )
        )
        + entity_merge.spantext_ids
    )
    new_entity = EntityCreate(
        name=entity_merge.name,
        project_id=entity_merge.project_id,
        span_text_ids=all_span_texts,
        is_human=True,
        knowledge_base_id=entity_merge.knowledge_base_id,
    )
    db_obj = crud_entity.create(db=db, create_dto=new_entity, force=True)
    return EntityRead.model_validate(db_obj)


# add resolve endpoint
@router.put(
    "/release",
    response_model=List[EntityRead],
    summary="Releases entities and/or span texts with given IDs.",
)
def release_entities(
    *,
    db: Session = Depends(get_db_session),
    entity_resolve: EntityRelease,
    authz_user: AuthzUser = Depends(),
) -> EntityRead:
    authz_user.assert_in_same_project_as_many(Crud.ENTITY, entity_resolve.entity_ids)
    all_span_texts = (
        list(
            chain.from_iterable(
                [st.id for st in crud_entity.read(db=db, id=id).span_texts]
                for id in entity_resolve.entity_ids
            )
        )
        + entity_resolve.spantext_ids
    )
    new_entities = []
    for span_text_id in all_span_texts:
        span_text = crud_span_text.read(db=db, id=span_text_id)
        new_entity = EntityCreate(
            name=span_text.text,
            project_id=entity_resolve.project_id,
            span_text_ids=[span_text_id],
        )
        new_entities.append(new_entity)
    db_objs = crud_entity.create_multi(db=db, create_dtos=new_entities, force=True)
    return [EntityRead.model_validate(db_obj) for db_obj in db_objs]
