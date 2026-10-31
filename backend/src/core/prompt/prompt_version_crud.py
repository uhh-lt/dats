from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.prompt.prompt_dto import (
    PromptVersionCreateIntern,
)
from core.prompt.prompt_orm import PromptVersionORM
from repos.db.crud_base import SQLCRUDBase, UpdateNotAllowed


class CRUDPromptVersion(
    SQLCRUDBase[PromptVersionORM, PromptVersionCreateIntern, UpdateNotAllowed]
):
    ### CREATE OPERATIONS ###

    def create_multi(
        self,
        db: Session,
        *,
        create_dtos: list[PromptVersionCreateIntern],
    ) -> list[PromptVersionORM]:
        """
        Create versions and keep the version lists of loaded prompts current.

        Args:
            create_dtos: The versions to create.

        Returns:
            The created versions, in the order of `create_dtos`.
        """
        db_objs = super().create_multi(db=db, create_dtos=create_dtos)
        for db_obj in db_objs:
            db.expire(db_obj.prompt, ["versions"])
        return db_objs

    ### READ OPERATIONS ###

    def read_by_prompt(self, db: Session, *, prompt_id: int) -> list[PromptVersionORM]:
        """
        Read all versions of a prompt.

        Args:
            prompt_id: The ID of the prompt.

        Returns:
            The versions of the prompt, oldest first.
        """
        return (
            db.query(self.model)
            .filter(self.model.prompt_id == prompt_id)
            .order_by(self.model.version)
            .all()
        )

    ### OTHER OPERATIONS ###

    def count_by_prompt(self, db: Session, *, prompt_id: int) -> int:
        """
        Count the versions of a prompt.

        Args:
            prompt_id: The ID of the prompt.

        Returns:
            The number of versions, which is also the highest version number.
        """
        return (
            db.scalar(
                select(func.count())
                .select_from(self.model)
                .where(self.model.prompt_id == prompt_id)
            )
            or 0
        )


crud_prompt_version = CRUDPromptVersion(PromptVersionORM)
