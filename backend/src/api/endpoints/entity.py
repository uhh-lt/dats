from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_current_user, get_db_session
from api.util import get_object_memo_for_user, get_object_memos
from api.validation import Validate
from app.core.authorization.authz_user import AuthzUser
from app.core.data.crud import Crud
from app.core.data.crud.entity import crud_entity
from app.core.data.crud.span_text_entity_link import crud_span_text_entity_link
from app.core.data.dto.entity import (
    EntityCreate,
    EntityMerge,
    EntityRead,
    EntityResolve,
    EntityUpdate,
)
from app.core.data.dto.span_text_entity_link import SpanTextEntityLinkCreate

router = APIRouter(
    prefix="/entity", dependencies=[Depends(get_current_user)], tags=["entity"]
)


@router.put(
    "",
    response_model=EntityRead,
    summary="Creates a new Entity and returns it with the generated ID.",
)
def create_new_entity(
    *,
    db: Session = Depends(get_db_session),
    entity: EntityCreate,
    authz_user: AuthzUser = Depends(),
) -> EntityRead:
    authz_user.assert_in_project(entity.project_id)

    db_obj = crud_entity.create(db=db, create_dto=entity)

    return EntityRead.model_validate(db_obj)


@router.get(
    "/{entity_id}",
    response_model=EntityRead,
    summary="Returns the Entity with the given ID.",
)
def get_by_id(
    *,
    db: Session = Depends(get_db_session),
    entity_id: int,
    authz_user: AuthzUser = Depends(),
) -> EntityRead:
    authz_user.assert_in_same_project_as(Crud.ENTITY, entity_id)
    db_obj = crud_entity.read(db=db, id=entity_id)
    return EntityRead.model_validate(db_obj)


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

    db_obj = crud_entity.update(db=db, id=entity_id, update_dto=entity)
    return EntityRead.model_validate(db_obj)


# add merge endpoint
@router.put(
    "/merge",
    response_model=EntityRead,
    summary="Merges entities with given IDs.",
)
def merge_entities(
    *,
    db: Session = Depends(get_db_session),
    entity_merge: EntityMerge,
    authz_user: AuthzUser = Depends(),
) -> EntityRead:
    print("merge_entities")
    authz_user.assert_in_same_project_as_many(Crud.ENTITY, entity_merge.entity_ids)
    db_obj = crud_entity.merge(db=db, merge_dto=entity_merge)
    return EntityRead.model_validate(db_obj)


# add resolve endpoint
@router.put(
    "/resolve",
    response_model=List[EntityRead],
    summary="Resolve entities with given IDs.",
)
def resolve_entities(
    *,
    db: Session = Depends(get_db_session),
    entity_resolve: EntityResolve,
    authz_user: AuthzUser = Depends(),
) -> EntityRead:
    print("resolve_entities")
    authz_user.assert_in_same_project_as_many(Crud.ENTITY, entity_resolve.entity_ids)
    db_objs = crud_entity.resolve(db=db, resolve_dto=entity_resolve)
    return [EntityRead.model_validate(db_obj) for db_obj in db_objs]


@router.delete(
    "/{entity_id}",
    response_model=EntityRead,
    summary="Deletes the Entity with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    entity_id: int,
    authz_user: AuthzUser = Depends(),
) -> EntityRead:
    authz_user.assert_in_same_project_as(Crud.ENTITY, entity_id)

    db_obj = crud_entity.remove(db=db, id=entity_id)
    return EntityRead.model_validate(db_obj)
