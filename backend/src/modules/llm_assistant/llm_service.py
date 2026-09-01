from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.span_annotation_crud import crud_span_anno
from core.user.user_crud import (
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_ZEROSHOT_ID,
)
from modules.llm_assistant.llm_job_dto import (
    ApproachRecommendation,
    ApproachType,
    LLMJobParameters,
    LLMPromptTemplates,
    StrategyInfo,
    StrategyType,
    TaskType,
)
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
        self, db: Session, llm_job_params: LLMJobParameters
    ) -> ApproachRecommendation:
        task_cls = get_task_class(llm_job_params.llm_job_type)
        return task_cls.determine_approach(
            db=db, task_parameters=llm_job_params.specific_task_parameters
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
                    llm_strategy_type=strategy_cls.strategy_type,
                    name=strategy_cls.display_name,
                    description=strategy_cls.description,
                    default_params=strategy_cls.default_params(),
                    allowed_data_tags=list(strategy_cls.allowed_data_tags),
                )
            )
        return infos

    def create_prompt_templates(
        self,
        db: Session,
        llm_job_params: LLMJobParameters,
        approach_type: ApproachType,
        strategy_type: StrategyType,
        strategy_params=None,
        example_ids: list[int] | None = None,
    ) -> list[LLMPromptTemplates]:
        # init the strategy with the provided specific parameters
        # the init process will generate prompt templates
        strategy = build_strategy(
            db=db,
            project_id=llm_job_params.project_id,
            is_fewshot=approach_type == ApproachType.LLM_FEW_SHOT,
            task_type=llm_job_params.llm_job_type,
            strategy_type=strategy_type,
            strategy_params=strategy_params,
            params=llm_job_params.specific_task_parameters,
            example_ids=example_ids,
        )
        return list(strategy.lang2prompt_templates.values())
