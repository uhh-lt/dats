from sqlalchemy.orm import Session, selectinload
from sqlalchemy.sql.base import ExecutableOption

from core.prompt_template.prompt_template_dto import (
    PromptTemplateCreateIntern,
    PromptTemplateUpdate,
)
from core.prompt_template.prompt_template_orm import PromptTemplateORM
from repos.db.crud_base import SQLCRUDBase


class CRUDPromptTemplate(
    SQLCRUDBase[PromptTemplateORM, PromptTemplateCreateIntern, PromptTemplateUpdate]
):
    ### READ OPERATIONS ###

    def read_by_project(
        self, db: Session, *, project_id: int
    ) -> list[PromptTemplateORM]:
        """
        Read all prompt templates of a project.

        Args:
            project_id: The ID of the project.

        Returns:
            The prompt templates of the project, ordered by name.
        """
        return (
            db.query(self.model)
            .options(*self._load_options())
            .filter(self.model.project_id == project_id)
            .order_by(self.model.name)
            .all()
        )

    ### LOADING ###

    def _load_options(self) -> list[ExecutableOption]:
        # the Read DTO lists all versions
        return [selectinload(self.model.versions)]


crud_prompt_template = CRUDPromptTemplate(PromptTemplateORM)
