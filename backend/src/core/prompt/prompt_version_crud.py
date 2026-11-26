from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.prompt.prompt_dto import (
    PromptVersionCreateIntern,
)
from core.prompt.prompt_orm import PromptVersionORM
from repos.db.crud_base import UpdateNotAllowed
from repos.db.project_crud_base import ProjectCRUDBase


class CRUDPromptVersion(
    ProjectCRUDBase[PromptVersionORM, PromptVersionCreateIntern, UpdateNotAllowed]
):
    ### CREATE OPERATIONS ###

    def create_multi(
        self,
        db: Session,
        *,
        project_id: int,
        create_dtos: list[PromptVersionCreateIntern],
    ) -> list[PromptVersionORM]:
        """
        Create versions and keep the version lists of loaded prompts current.

        Args:
            project_id: The project of the versions.
            create_dtos: The versions to create.

        Returns:
            The created versions, in the order of `create_dtos`.
        """
        db_objs = super().create_multi(
            db=db, project_id=project_id, create_dtos=create_dtos
        )
        for db_obj in db_objs:
            db.expire(db_obj.prompt, ["versions"])
        return db_objs

    ### READ OPERATIONS ###

    def read_by_prompt(
        self, db: Session, *, project_id: int, prompt_id: int
    ) -> list[PromptVersionORM]:
        """
        Read all versions of a prompt.

        Args:
            project_id: The project of the prompt.
            prompt_id: The ID of the prompt.

        Returns:
            The versions of the prompt, oldest first.
        """
        return (
            db.query(self.model)
            .filter(
                self.model.project_id == project_id, self.model.prompt_id == prompt_id
            )
            .order_by(self.model.version)
            .all()
        )

    ### OTHER OPERATIONS ###

    def count_by_prompt(self, db: Session, *, project_id: int, prompt_id: int) -> int:
        """
        Count the versions of a prompt.

        Args:
            project_id: The project of the prompt.
            prompt_id: The ID of the prompt.

        Returns:
            The number of versions, which is also the highest version number.
        """
        return (
            db.scalar(
                select(func.count())
                .select_from(self.model)
                .where(
                    self.model.project_id == project_id,
                    self.model.prompt_id == prompt_id,
                )
            )
            or 0
        )


crud_prompt_version = CRUDPromptVersion(PromptVersionORM)
