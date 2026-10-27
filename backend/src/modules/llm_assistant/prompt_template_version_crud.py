from sqlalchemy import func, select
from sqlalchemy.orm import Session

from modules.llm_assistant.prompt_template_dto import (
    PromptTemplateVersionCreateIntern,
)
from modules.llm_assistant.prompt_template_orm import PromptTemplateVersionORM
from repos.db.crud_base import SQLCRUDBase, UpdateNotAllowed


class CRUDPromptTemplateVersion(
    SQLCRUDBase[
        PromptTemplateVersionORM, PromptTemplateVersionCreateIntern, UpdateNotAllowed
    ]
):
    ### CREATE OPERATIONS ###

    def create_multi(
        self,
        db: Session,
        *,
        create_dtos: list[PromptTemplateVersionCreateIntern],
    ) -> list[PromptTemplateVersionORM]:
        """
        Create versions and keep the version lists of loaded templates current.

        Args:
            create_dtos: The versions to create.

        Returns:
            The created versions, in the order of `create_dtos`.
        """
        db_objs = super().create_multi(db=db, create_dtos=create_dtos)
        for db_obj in db_objs:
            db.expire(db_obj.prompt_template, ["versions"])
        return db_objs

    ### READ OPERATIONS ###

    def read_by_prompt_template(
        self, db: Session, *, prompt_template_id: int
    ) -> list[PromptTemplateVersionORM]:
        """
        Read all versions of a prompt template.

        Args:
            prompt_template_id: The ID of the prompt template.

        Returns:
            The versions of the prompt template, oldest first.
        """
        return (
            db.query(self.model)
            .filter(self.model.prompt_template_id == prompt_template_id)
            .order_by(self.model.version)
            .all()
        )

    ### OTHER OPERATIONS ###

    def count_by_prompt_template(self, db: Session, *, prompt_template_id: int) -> int:
        """
        Count the versions of a prompt template.

        Args:
            prompt_template_id: The ID of the prompt template.

        Returns:
            The number of versions, which is also the highest version number.
        """
        return (
            db.scalar(
                select(func.count())
                .select_from(self.model)
                .where(self.model.prompt_template_id == prompt_template_id)
            )
            or 0
        )


crud_prompt_template_version = CRUDPromptTemplateVersion(PromptTemplateVersionORM)
