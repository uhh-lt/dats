from fastapi import status
from sqlalchemy import func
from sqlalchemy.orm import Session

from common.exception_handler import exception_handler
from core.memo.memo_view_dto import (
    MemoViewBase,
    MemoViewCreate,
    MemoViewRead,
    MemoViewUpdate,
)
from core.memo.memo_view_orm import MemoViewORM
from repos.db.crud_base import CRUDBase


@exception_handler(status.HTTP_400_BAD_REQUEST)
class InvalidMemoViewOrderError(Exception):
    pass


class CRUDMemoView(CRUDBase[MemoViewORM, MemoViewCreate, MemoViewUpdate]):
    ### CREATE OPERATIONS ###

    def create(
        self, db: Session, *, create_dto: MemoViewCreate, user_id: int
    ) -> MemoViewORM:
        last_position = (
            db.query(func.max(MemoViewORM.position))
            .filter(
                MemoViewORM.project_id == create_dto.project_id,
                MemoViewORM.user_id == user_id,
            )
            .scalar()
        )
        view = MemoViewORM(
            name=create_dto.name.strip(),
            layout=create_dto.layout.value,
            filters=create_dto.filters.model_dump(mode="json"),
            group_by=(
                create_dto.group_by.model_dump(mode="json")
                if create_dto.group_by is not None
                else None
            ),
            sort_by=(
                create_dto.sort_by.model_dump(mode="json")
                if create_dto.sort_by is not None
                else None
            ),
            project_id=create_dto.project_id,
            user_id=user_id,
            position=(last_position + 1 if last_position is not None else 0),
        )
        db.add(view)
        db.flush()
        db.refresh(view)
        return view

    ### READ OPERATIONS ###

    def read_by_user_and_project(
        self, db: Session, *, project_id: int, user_id: int
    ) -> list[MemoViewORM]:
        return (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.user_id == user_id,
            )
            .order_by(self.model.position.asc(), self.model.id.asc())
            .all()
        )

    ### UPDATE OPERATIONS ###

    def update(
        self, db: Session, *, id: int, update_dto: MemoViewUpdate
    ) -> MemoViewORM:
        view = self.read(db=db, id=id)
        current = MemoViewRead.model_validate(view)
        group_by = current.group_by
        sort_by = current.sort_by
        if update_dto.clear_group_by:
            group_by = None
        elif update_dto.group_by is not None:
            group_by = update_dto.group_by
        if update_dto.clear_sort_by:
            sort_by = None
        elif update_dto.sort_by is not None:
            sort_by = update_dto.sort_by

        merged = MemoViewBase(
            name=(
                update_dto.name.strip() if update_dto.name is not None else current.name
            ),
            layout=update_dto.layout or current.layout,
            filters=update_dto.filters or current.filters,
            group_by=group_by,
            sort_by=sort_by,
        )
        view.name = merged.name
        view.layout = merged.layout.value
        view.filters = merged.filters.model_dump(mode="json")
        view.group_by = (
            merged.group_by.model_dump(mode="json")
            if merged.group_by is not None
            else None
        )
        view.sort_by = (
            merged.sort_by.model_dump(mode="json")
            if merged.sort_by is not None
            else None
        )
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
        ordered_view_ids: list[int],
    ) -> list[MemoViewORM]:
        views = (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id,
                self.model.user_id == user_id,
            )
            .with_for_update()
            .all()
        )
        views_by_id = {view.id: view for view in views}
        if len(ordered_view_ids) != len(views) or set(ordered_view_ids) != set(
            views_by_id
        ):
            raise InvalidMemoViewOrderError(
                "Memo view order must contain every personal view in the project exactly once"
            )

        ordered_views = [views_by_id[view_id] for view_id in ordered_view_ids]
        for position, view in enumerate(ordered_views):
            view.position = position

        db.add_all(ordered_views)
        db.flush()
        return ordered_views


crud_memo_view = CRUDMemoView(MemoViewORM)
