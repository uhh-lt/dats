from sqlalchemy.orm import Session, selectinload
from sqlalchemy.sql.base import ExecutableOption

from core.prompt.prompt_dto import (
    PromptCreateIntern,
    PromptUpdate,
)
from core.prompt.prompt_orm import PromptORM
from repos.db.crud_base import SQLCRUDBase


class CRUDPrompt(SQLCRUDBase[PromptORM, PromptCreateIntern, PromptUpdate]):
    ### READ OPERATIONS ###

    def read_by_project(self, db: Session, *, project_id: int) -> list[PromptORM]:
        """
        Read all prompts of a project.

        Args:
            project_id: The ID of the project.

        Returns:
            The prompts of the project, ordered by name.
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


crud_prompt = CRUDPrompt(PromptORM)
