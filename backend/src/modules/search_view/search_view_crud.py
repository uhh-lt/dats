from sqlalchemy import func
from sqlalchemy.orm import Session

from common.common_exceptions import DuplicateIdsError
from modules.search_view.search_view_dto import (
    SearchViewCreateIntern,
    SearchViewUpdateUnion,
    search_view_read_from_orm,
)
from modules.search_view.search_view_enum import SearchEntityType
from modules.search_view.search_view_exceptions import InvalidSearchViewOrderError
from modules.search_view.search_view_orm import SearchViewORM
from repos.db.crud_base import SQLCRUDBase


class CRUDSearchView(
    SQLCRUDBase[SearchViewORM, SearchViewCreateIntern, SearchViewUpdateUnion]
):
    ### CREATE OPERATIONS ###

    # Inherited from SQLCRUDBase

    ### READ OPERATIONS ###

    def read_last_position(
        self,
        db: Session,
        *,
        project_id: int,
        user_id: int,
        entity_type: SearchEntityType,
    ) -> int | None:
        """
        Read the highest position among a user's views of an entity type.

        Returns:
            The highest position, or None if the user has no such view.
        """
        return (
            db.query(func.max(self.model.position))
            .filter(
                self.model.project_id == project_id,
                self.model.user_id == user_id,
                self.model.entity_type == entity_type.value,
            )
            .scalar()
        )

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

    def update_multi(
        self,
        db: Session,
        *,
        ids: list[int],
        update_dtos: list[SearchViewUpdateUnion],
    ) -> list[SearchViewORM]:
        if len(ids) != len(update_dtos):
            raise ValueError(
                f"The number of IDs and Update DTO objects must equal! {len(ids)} IDs and {len(update_dtos)} Update DTOs received."
            )
        if len(set(ids)) != len(ids):
            raise DuplicateIdsError(
                [id for id in dict.fromkeys(ids) if ids.count(id) > 1]
            )

        views = self.read_by_ids(db=db, ids=ids)
        for view, update_dto in zip(views, update_dtos):
            self._merge(view=view, update_dto=update_dto)
        db.flush()
        return views

    ### OTHER OPERATIONS ###

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

    def _merge(self, *, view: SearchViewORM, update_dto: SearchViewUpdateUnion) -> None:
        """Merge a patch onto a stored view, re-validating the merged state."""
        # Validate the stored ORM row into its fully-typed (entity-specific) state.
        current = search_view_read_from_orm(view)

        # Merge the patch onto the current state. For every update field: omitted ->
        # keep `current`; explicitly provided -> use the provided value (so
        # `group_by=null` clears grouping, `sorts=[]` clears sorting). Field names come
        # from the update model itself, so renaming a field renames the merge behavior.
        merged_data = current.model_dump()
        for field_name in type(update_dto).model_fields:
            if field_name in update_dto.model_fields_set:
                merged_data[field_name] = getattr(update_dto, field_name)

        # Re-validate through the stored view's entity-specific class. This re-runs the
        # group/board validators and normalizes an explicit `sorts=null` to [].
        merged = type(current).model_validate(merged_data)

        view.name = merged.name
        view.layout = merged.layout.value
        view.filters = merged.filters.model_dump(mode="json")
        view.group_by = (
            merged.group_by.model_dump(mode="json")
            if merged.group_by is not None
            else None
        )
        view.sorts = [s.model_dump(mode="json") for s in merged.sorts]
        view.selected_properties = (
            [p.value for p in merged.selected_properties]
            if merged.selected_properties is not None
            else None
        )


crud_search_view = CRUDSearchView(SearchViewORM)
