from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from modules.search_view.search_view_crud import crud_search_view
from modules.search_view.search_view_dto import (
    SearchViewCreateIntern,
    SearchViewCreateUnion,
    SearchViewReadUnion,
    search_view_read_from_orm,
)
from modules.search_view.search_view_orm import SearchViewORM


class SearchViewService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        return super(SearchViewService, cls).__new__(cls)

    def create(
        self, db: Session, *, user_id: int, create_dto: SearchViewCreateUnion
    ) -> SearchViewReadUnion:
        """
        Create a personal search view of a user, placed after the user's other views
        of the same entity type.

        Args:
            user_id: The user the view belongs to.
            create_dto: The view to create.

        Returns:
            The created view.
        """
        return search_view_read_from_orm(
            self.create_view_orm(db=db, user_id=user_id, create_dto=create_dto)
        )

    def create_view_orm(
        self, db: Session, *, user_id: int, create_dto: SearchViewCreateUnion
    ) -> SearchViewORM:
        """
        Like `create`, but returns the ORM object. For other services, jobs and
        test fixtures that need the ORM object.
        """
        # 1) append the view after the user's other views of the entity type
        last_position = crud_search_view.read_last_position(
            db=db,
            project_id=create_dto.project_id,
            user_id=user_id,
            entity_type=create_dto.entity_type,
        )

        # 2) store the serialized view
        return crud_search_view.create(
            db=db,
            create_dto=SearchViewCreateIntern(
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
                selected_properties=(
                    [p.value for p in create_dto.selected_properties]
                    if create_dto.selected_properties is not None
                    else None
                ),
                project_id=create_dto.project_id,
                user_id=user_id,
                position=last_position + 1 if last_position is not None else 0,
            ),
        )
