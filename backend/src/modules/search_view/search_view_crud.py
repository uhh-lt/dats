from fastapi import status
from sqlalchemy import func
from sqlalchemy.orm import Session

from common.exception_handler import exception_handler
from modules.search_view.search_view_dto import (
    SearchEntityType,
    SearchViewCreate,
    SearchViewUpdate,
    search_view_read_from_orm,
)
from modules.search_view.search_view_orm import SearchViewORM
from repos.db.crud_base import CRUDBase


@exception_handler(status.HTTP_400_BAD_REQUEST)
class InvalidSearchViewOrderError(Exception):
    pass


class CRUDSearchView(CRUDBase[SearchViewORM, SearchViewCreate, SearchViewUpdate]):
    ### CREATE OPERATIONS ###

    def create(
        self,
        db: Session,
        *,
        create_dto: SearchViewCreate,
        user_id: int,
    ) -> SearchViewORM:
        last_position = (
            db.query(func.max(SearchViewORM.position))
            .filter(
                SearchViewORM.project_id == create_dto.project_id,
                SearchViewORM.user_id == user_id,
                SearchViewORM.entity_type == create_dto.entity_type.value,
            )
            .scalar()
        )
        view = SearchViewORM(
            name=create_dto.name.strip(),
            entity_type=create_dto.entity_type.value,
            layout=create_dto.layout.value,
            filters=create_dto.filters.model_dump(mode="json"),
            group_by=(
                create_dto.group_by.model_dump(mode="json")
                if create_dto.group_by is not None
                else None
            ),
            sorts=[s.model_dump(mode="json") for s in create_dto.sorts],
            project_id=create_dto.project_id,
            user_id=user_id,
            position=(last_position + 1 if last_position is not None else 0),
        )
        db.add(view)
        db.flush()
        db.refresh(view)
        return view

    ### READ OPERATIONS ###

    def read_by_user_project_and_entity(
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        entity_type: SearchEntityType,
    ) -> list[SearchViewORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.user_id == user_id,
                self.model.entity_type == entity_type.value,
            )
            .order_by(self.model.position.asc(), self.model.id.asc())
            .all()
        )

    ### UPDATE OPERATIONS ###

    def update(
        self, db: Session, *, id: int, update_dto: SearchViewUpdate
    ) -> SearchViewORM:
        view = self.read(db=db, id=id)

        # Validate the stored ORM row into its fully-typed (entity-specific) state,
        # then apply the patch (omitted fields keep current, explicit null clears).
        current = search_view_read_from_orm(view)
        merged = update_dto.merged_with(current)

        view.name = merged.name
        view.layout = merged.layout.value
        view.filters = merged.filters.model_dump(mode="json")
        view.group_by = (
            merged.group_by.model_dump(mode="json")
            if merged.group_by is not None
            else None
        )
        view.sorts = [s.model_dump(mode="json") for s in merged.sorts]
        db.add(view)
        db.flush()
        db.refresh(view)
        return view

    def reorder(
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        entity_type: SearchEntityType,
        ordered_view_ids: list[int],
    ) -> list[SearchViewORM]:
        views = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.user_id == user_id,
                self.model.entity_type == entity_type.value,
            )
            .with_for_update()
            .all()
        )
        views_by_id = {view.id: view for view in views}
        if len(ordered_view_ids) != len(views) or set(ordered_view_ids) != set(
            views_by_id
        ):
            raise InvalidSearchViewOrderError(
                "Search view order must contain every personal view of this entity "
                "type in the project exactly once"
            )

        ordered_views = [views_by_id[view_id] for view_id in ordered_view_ids]
        for position, view in enumerate(ordered_views):
            view.position = position

        db.add_all(ordered_views)
        db.flush()
        return ordered_views


crud_search_view = CRUDSearchView(SearchViewORM)
