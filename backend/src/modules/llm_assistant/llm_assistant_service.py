from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.span_annotation_crud import crud_span_anno
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.user.user_crud import (
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_ZEROSHOT_ID,
)
from modules.llm_assistant.llm_assistant_enum import (
    ApproachType,
    StrategyType,
    TaskType,
)
from modules.llm_assistant.llm_assistant_exceptions import InvalidPromptPreviewError
from modules.llm_assistant.llm_assistant_job_dto import (
    ApproachRecommendation,
    LLMAssistantJobParameters,
    LLMAssistantPromptPreview,
    LLMAssistantPromptPreviewRequest,
    LLMAssistantPromptTemplates,
    SpecificStrategyParameters,
    StrategyInfo,
)
from modules.llm_assistant.prompt_template_service import PromptTemplateService
from modules.llm_assistant.strategies.strategy_factory import (
    STRATEGIES_FOR_TASK_TYPE,
    build_strategy,
)
from modules.llm_assistant.tasks.task_factory import get_task_class
from repos.llm_repo import LLMRepo
from repos.ray.ray_repo import RayRepo
from repos.vector.weaviate_repo import WeaviateRepo


class LLMAssistantService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.llm: LLMRepo = LLMRepo()
        cls.ray: RayRepo = RayRepo()
        cls.weaviate: WeaviateRepo = WeaviateRepo()
        return super(LLMAssistantService, cls).__new__(cls)

    def determine_approach(
        self, db: Session, job_params: LLMAssistantJobParameters
    ) -> ApproachRecommendation:
        task_cls = get_task_class(job_params.task_type)
        return task_cls.determine_approach(
            db=db, task_parameters=job_params.specific_task_parameters
        )

    def count_existing_assistant_annotations(
        self,
        db: Session,
        task_type: TaskType,
        code_ids: list[int],
        sdoc_ids: list[int],
        approach_type: ApproachType,
    ) -> dict[int, int]:
        approachtype2userid = {
            ApproachType.LLM_ZERO_SHOT: ASSISTANT_ZEROSHOT_ID,
            ApproachType.LLM_FEW_SHOT: ASSISTANT_FEWSHOT_ID,
        }
        user_id = approachtype2userid[approach_type]

        match task_type:
            case TaskType.SENTENCE_ANNOTATION:
                # 1. Find existing annotations
                existing_annotations = crud_sentence_anno.read_by_user_sdocs_codes(
                    db=db,
                    user_id=user_id,
                    sdoc_ids=sdoc_ids,
                    code_ids=code_ids,
                )
            case TaskType.ANNOTATION:
                # 1. Find existing annotations
                existing_annotations = crud_span_anno.read_by_user_sdocs_codes(
                    db=db,
                    user_id=user_id,
                    sdoc_ids=sdoc_ids,
                    code_ids=code_ids,
                )
            case _:
                return {}

        # 2. Count the number of existing annotations per code
        code_id2num_existing_annos = {code_id: 0 for code_id in code_ids}
        for existing_anno in existing_annotations:
            code_id2num_existing_annos[existing_anno.code_id] += 1

        return code_id2num_existing_annos

    def list_strategies(self, task_type: TaskType) -> list[StrategyInfo]:
        """Return StrategyInfo for all strategies supporting the given task."""
        infos: list[StrategyInfo] = []
        for strategy_cls in STRATEGIES_FOR_TASK_TYPE.get(task_type, []):
            infos.append(
                StrategyInfo(
                    strategy_type=strategy_cls.strategy_type,
                    name=strategy_cls.display_name,
                    description=strategy_cls.description,
                    default_params=strategy_cls.default_params(),
                    allowed_data_tags=[
                        tag.value for tag in strategy_cls.allowed_data_tags
                    ],
                )
            )
        return infos

    def create_prompt_templates(
        self,
        db: Session,
        job_params: LLMAssistantJobParameters,
        approach_type: ApproachType,
        strategy_type: StrategyType,
        strategy_params: SpecificStrategyParameters | None = None,
        example_ids: list[int] | None = None,
    ) -> list[LLMAssistantPromptTemplates]:
        # init the strategy with the provided specific parameters
        # the init process will generate prompt templates
        strategy = build_strategy(
            db=db,
            project_id=job_params.project_id,
            is_fewshot=approach_type == ApproachType.LLM_FEW_SHOT,
            task_type=job_params.task_type,
            strategy_type=strategy_type,
            params=job_params.specific_task_parameters,
            strategy_params=strategy_params,
            example_ids=example_ids,
        )
        return list(strategy.lang2prompt_templates.values())

    def preview_prompt(
        self, db: Session, request: LLMAssistantPromptPreviewRequest
    ) -> LLMAssistantPromptPreview:
        """Render the prompts of one message of a document as the job would send them.

        The code definitions come from the task parameters (or the project), so
        unsaved template edits and experiment-scoped definitions can be previewed.
        """
        # 1) resolve the prompts and build the strategy that renders them
        prompt_templates = PromptTemplateService().resolve_prompts(
            db=db,
            project_id=request.project_id,
            task_type=request.task_type,
            strategy_type=request.strategy_type,
            source=request,
        )
        strategy = build_strategy(
            db=db,
            project_id=request.project_id,
            is_fewshot=False,
            task_type=request.task_type,
            strategy_type=request.strategy_type,
            params=request.specific_task_parameters,
            strategy_params=request.specific_strategy_parameters,
            prompt_templates=prompt_templates,
        )

        # 2) render the requested message in the document's language
        if crud_sdoc.read(db=db, id=request.sdoc_id).project_id != request.project_id:
            raise InvalidPromptPreviewError(
                f"Document {request.sdoc_id} does not belong to project "
                f"{request.project_id}."
            )
        sdoc_data = crud_sdoc_data.read(db=db, id=request.sdoc_id)
        language = crud_sdoc_meta.read_by_sdoc_and_key(
            db=db, sdoc_id=request.sdoc_id, key="language"
        ).str_value
        if language is None or language not in strategy.supported_languages:
            raise InvalidPromptPreviewError(
                f"Document {request.sdoc_id} has the unsupported language "
                f"'{language}'. Supported languages are {strategy.supported_languages}."
            )
        message, num_messages = strategy.preview_prompt(
            language=language,
            sdoc_data=sdoc_data,
            message_index=request.message_index,
        )
        return LLMAssistantPromptPreview(
            sdoc_id=request.sdoc_id,
            language=language,
            message_index=request.message_index,
            num_messages=num_messages,
            system_prompt=message.system_prompt,
            user_prompt=message.user_prompt,
        )
