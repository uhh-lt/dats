from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from modules.llm_assistant.llm_assistant_enum import StrategyType, TaskType
from modules.llm_assistant.llm_assistant_exceptions import (
    PromptTemplateMismatchError,
)
from modules.llm_assistant.llm_assistant_job_dto import (
    LLMAssistantPromptTemplates,
    PromptTemplateSource,
)
from modules.llm_assistant.prompt_template_crud import crud_prompt_template
from modules.llm_assistant.prompt_template_dto import (
    PromptTemplateCreate,
    PromptTemplateCreateIntern,
    PromptTemplateRead,
    PromptTemplateUpdate,
    PromptTemplateVersionCreate,
    PromptTemplateVersionCreateIntern,
    PromptTemplateVersionRead,
)
from modules.llm_assistant.prompt_template_version_crud import (
    crud_prompt_template_version,
)
from modules.llm_assistant.strategies.strategy_factory import get_strategy_class


class PromptTemplateService(metaclass=SingletonMeta):
    """The register of prompt templates and their immutable versions."""

    def __new__(cls, *args, **kwargs):
        return super(PromptTemplateService, cls).__new__(cls)

    def create_prompt_template(
        self, *, db: Session, user_id: int, create_dto: PromptTemplateCreate
    ) -> PromptTemplateRead:
        # 1) validate the prompts of the first version for the template's strategy
        strategy_cls = get_strategy_class(
            create_dto.task_type, create_dto.strategy_type
        )
        strategy_cls.validate_prompt_templates(create_dto.prompts)

        # 2) create the template
        db_obj = crud_prompt_template.create(
            db=db,
            create_dto=PromptTemplateCreateIntern(
                name=create_dto.name,
                task_type=create_dto.task_type,
                strategy_type=create_dto.strategy_type,
                project_id=create_dto.project_id,
            ),
        )

        # 3) create its first version
        crud_prompt_template_version.create(
            db=db,
            create_dto=PromptTemplateVersionCreateIntern(
                prompt_template_id=db_obj.id,
                version=1,
                user_id=user_id,
                prompts=create_dto.prompts,
            ),
        )
        return self.read_prompt_template(db=db, prompt_template_id=db_obj.id)

    def create_prompt_template_version(
        self,
        *,
        db: Session,
        user_id: int,
        prompt_template_id: int,
        create_dto: PromptTemplateVersionCreate,
    ) -> PromptTemplateRead:
        """Save new prompts of a template as its next version.

        Older versions stay unchanged, so runs and jobs that reference them can
        always be reproduced.
        """
        # 1) validate the prompts for the template's strategy
        db_obj = crud_prompt_template.read(db=db, id=prompt_template_id)
        strategy_cls = get_strategy_class(db_obj.task_type, db_obj.strategy_type)
        strategy_cls.validate_prompt_templates(create_dto.prompts)

        # 2) append the next version
        num_versions = crud_prompt_template_version.count_by_prompt_template(
            db=db, prompt_template_id=prompt_template_id
        )
        crud_prompt_template_version.create(
            db=db,
            create_dto=PromptTemplateVersionCreateIntern(
                prompt_template_id=prompt_template_id,
                version=num_versions + 1,
                user_id=user_id,
                prompts=create_dto.prompts,
            ),
        )
        return self.read_prompt_template(db=db, prompt_template_id=prompt_template_id)

    def read_prompt_template(
        self, *, db: Session, prompt_template_id: int
    ) -> PromptTemplateRead:
        db_obj = crud_prompt_template.read(db=db, id=prompt_template_id)
        return PromptTemplateRead.model_validate(db_obj)

    def read_prompt_templates_by_project(
        self, *, db: Session, project_id: int
    ) -> list[PromptTemplateRead]:
        db_objs = crud_prompt_template.read_by_project(db=db, project_id=project_id)
        return [PromptTemplateRead.model_validate(db_obj) for db_obj in db_objs]

    def read_prompt_template_version(
        self, *, db: Session, version_id: int
    ) -> PromptTemplateVersionRead:
        db_obj = crud_prompt_template_version.read(db=db, id=version_id)
        return PromptTemplateVersionRead.model_validate(db_obj)

    def update_prompt_template(
        self,
        *,
        db: Session,
        prompt_template_id: int,
        update_dto: PromptTemplateUpdate,
    ) -> PromptTemplateRead:
        """Rename a template. Renaming does not create a version."""
        crud_prompt_template.update(db=db, id=prompt_template_id, update_dto=update_dto)
        return self.read_prompt_template(db=db, prompt_template_id=prompt_template_id)

    def delete_prompt_template(
        self, *, db: Session, prompt_template_id: int
    ) -> PromptTemplateRead:
        """Delete a template with all its versions."""
        result = self.read_prompt_template(db=db, prompt_template_id=prompt_template_id)
        crud_prompt_template.delete(db=db, id=prompt_template_id)
        return result

    def resolve_prompts(
        self,
        *,
        db: Session,
        project_id: int,
        task_type: TaskType,
        strategy_type: StrategyType,
        source: PromptTemplateSource,
    ) -> list[LLMAssistantPromptTemplates]:
        """Return the inline prompts, or the prompts of the referenced version.

        Raises:
            NoSuchElementError: If the version does not exist.
            PromptTemplateMismatchError: If the version belongs to another project,
                task or strategy.
        """
        if source.prompts is not None:
            return source.prompts

        assert source.prompt_template_version_id is not None
        db_obj = crud_prompt_template_version.read(
            db=db, id=source.prompt_template_version_id
        )
        template = db_obj.prompt_template
        if (
            template.project_id != project_id
            or template.task_type != task_type
            or template.strategy_type != strategy_type
        ):
            raise PromptTemplateMismatchError(
                version_id=db_obj.id, task_type=task_type, strategy_type=strategy_type
            )
        return PromptTemplateVersionRead.model_validate(db_obj).prompts
