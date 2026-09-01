from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from config import conf
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.span_annotation_crud import crud_span_anno
from core.code.code_crud import crud_code
from core.user.user_crud import (
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_ZEROSHOT_ID,
    SYSTEM_USER_IDS,
)
from modules.llm_assistant.llm_exceptions import UnsupportedLLMJobTypeError
from modules.llm_assistant.llm_job_dto import (
    AnnotationParams,
    ApproachRecommendation,
    ApproachType,
    FewShotParams,
    LLMJobInput,
    LLMJobOutput,
    LLMJobParameters,
    LLMPromptTemplates,
    SentenceAnnotationParams,
    StrategyInfo,
    StrategyType,
    TaskType,
)
from modules.llm_assistant.llm_registry import (
    get_strategy_class,
    get_task_class,
    list_strategies,
)
from modules.llm_assistant.strategies.llm_strategy import LLMStrategy
from repos.llm_repo import LLMRepo
from repos.ray.ray_repo import RayRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.job_system.job_dto import Job

lac = conf.llm_assistant
BATCH_SIZE = 32


class LLMAssistantService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.llm: LLMRepo = LLMRepo()
        cls.ray: RayRepo = RayRepo()
        cls.weaviate: WeaviateRepo = WeaviateRepo()
        return super(LLMAssistantService, cls).__new__(cls)

    def _next_llm_job_step(self, job: Job, description: str) -> None:
        job.update(current_step=job.get_current_step() + 1, status_message=description)

    def _update_llm_job_description(self, job: Job, description: str) -> None:
        job.update(status_message=description)

    # --- STRATEGY INSTANTIATION ---

    def _build_strategy(
        self,
        db: Session,
        project_id: int,
        is_fewshot: bool,
        task_type: TaskType,
        strategy_type: StrategyType,
        strategy_params,
        prompt_templates: list[LLMPromptTemplates] | None = None,
        params=None,
        example_ids: list[int] | None = None,
    ) -> LLMStrategy:
        strategy_cls = get_strategy_class(task_type, strategy_type)

        # FuzzyGroundingStrategy takes strategy_params explicitly
        from modules.llm_assistant.strategies.fuzzy_grounding_strategy import (
            FuzzyGroundingStrategy,
        )

        if issubclass(strategy_cls, FuzzyGroundingStrategy):
            return strategy_cls(
                db=db,
                project_id=project_id,
                is_fewshot=is_fewshot,
                strategy_params=strategy_params,
                prompt_templates=prompt_templates,
                params=params,
                example_ids=example_ids,
            )

        return strategy_cls(
            db=db,
            project_id=project_id,
            is_fewshot=is_fewshot,
            prompt_templates=prompt_templates,
            params=params,
            example_ids=example_ids,
        )

    # --- JOB HANDLING ---

    def handle_llm_job(
        self, db: Session, job: Job, payload: LLMJobInput
    ) -> LLMJobOutput:
        num_batches = (
            len(payload.specific_task_parameters.sdoc_ids) + BATCH_SIZE - 1
        ) // BATCH_SIZE

        job.update(
            steps=["Start"]
            + [f"Batch Processing {i + 1}" for i in range(num_batches)]
            + ["Finish"],
            current_step=0,
            status_message="Started LLM Assistant!",
        )

        task_type = payload.llm_job_type
        approach_parameters = payload.specific_approach_parameters
        task_parameters = payload.specific_task_parameters
        is_fewshot = isinstance(approach_parameters, FewShotParams)

        # build the strategy
        strategy = self._build_strategy(
            db=db,
            project_id=payload.project_id,
            is_fewshot=is_fewshot,
            task_type=task_type,
            strategy_type=payload.llm_strategy_type,
            strategy_params=payload.specific_strategy_parameters,
            prompt_templates=approach_parameters.prompts,
            params=task_parameters,
        )

        # build the task
        task_cls = get_task_class(task_type)
        if task_cls is None:
            raise UnsupportedLLMJobTypeError(task_type)
        task = task_cls(llm=self.llm)

        # execute
        result = task.execute(
            db=db,
            job=job,
            project_id=payload.project_id,
            approach_parameters=approach_parameters,
            task_parameters=task_parameters,
            strategy=strategy,
        )

        job.update(
            current_step=len(job.get_steps()) - 1,
            status_message="Finished LLMJob successfully!",
        )

        return result

    # --- APPROACH DETERMINATION ---

    def determine_approach(
        self, db: Session, llm_job_params: LLMJobParameters
    ) -> ApproachRecommendation:
        match llm_job_params.llm_job_type:
            case TaskType.TAGGING:
                return ApproachRecommendation(
                    recommended_approach=ApproachType.LLM_ZERO_SHOT,
                    available_approaches={
                        ApproachType.LLM_ZERO_SHOT: True,
                        ApproachType.LLM_FEW_SHOT: False,
                    },
                    reasoning="Only zero-shot approach is available for document tagging (yet).",
                )
            case TaskType.METADATA_EXTRACTION:
                return ApproachRecommendation(
                    recommended_approach=ApproachType.LLM_ZERO_SHOT,
                    available_approaches={
                        ApproachType.LLM_ZERO_SHOT: True,
                        ApproachType.LLM_FEW_SHOT: False,
                    },
                    reasoning="Only zero-shot approach is available for metadata extraction (yet).",
                )
            case TaskType.ANNOTATION:
                assert isinstance(
                    llm_job_params.specific_task_parameters,
                    AnnotationParams,
                )

                selected_code_ids = llm_job_params.specific_task_parameters.code_ids

                # 1. Find the number of labeled spans for each code
                span_annotations = [
                    sa
                    for sa in crud_span_anno.read_by_codes(
                        db=db, code_ids=selected_code_ids
                    )
                    if sa.user_id
                    not in SYSTEM_USER_IDS  # exclude system / assistant users
                ]

                # 2. Find the code names
                codes = crud_code.read_by_ids(db=db, ids=selected_code_ids)
                code_id2name = {code.id: code.name for code in codes}

                # 3. Count annotations by code_id
                code_id2num_span_annos = {code.id: 0 for code in codes}
                for span_anno in span_annotations:
                    code_id2num_span_annos[span_anno.code_id] += 1

                # 4. Determine the minimum number of labeled spans
                code_with_min_labeled_spans = min(
                    code_id2num_span_annos.keys(),
                    key=lambda k: code_id2num_span_annos[k],
                )
                min_labeled_spans = code_id2num_span_annos[code_with_min_labeled_spans]

                # 5. Create reasoning
                reasoning = (
                    f"You selected {len(selected_code_ids)} codes. "
                    "I checked the number of labeled spans for each code and found:\n"
                )

                code_counts = []
                for code_id, num_labeled_spans in code_id2num_span_annos.items():
                    code_counts.append(f"{code_id2name[code_id]}: {num_labeled_spans}")
                reasoning += "\n".join(code_counts)

                reasoning += (
                    f"\nThe code with the least labeled spans ({min_labeled_spans}) "
                    f"is {code_id2name[code_with_min_labeled_spans]}. "
                    "Based on this, I recommend the following approach:"
                )

                # 6. Determine available approaches
                available_approaches: dict[ApproachType, bool] = {
                    ApproachType.LLM_ZERO_SHOT: True,
                    ApproachType.LLM_FEW_SHOT: min_labeled_spans
                    >= lac.few_shot_threshold,
                }

                # 7. Determine recommended approach
                if min_labeled_spans < lac.few_shot_threshold:
                    recommended_approach = ApproachType.LLM_ZERO_SHOT
                else:
                    recommended_approach = ApproachType.LLM_FEW_SHOT

                return ApproachRecommendation(
                    recommended_approach=recommended_approach,
                    available_approaches=available_approaches,
                    reasoning=reasoning,
                )
            case TaskType.SENTENCE_ANNOTATION:
                assert isinstance(
                    llm_job_params.specific_task_parameters,
                    SentenceAnnotationParams,
                )
                selected_code_ids = llm_job_params.specific_task_parameters.code_ids

                # 1. Find the number of labeled sentences for each code
                sentence_annotations = [
                    sa
                    for sa in crud_sentence_anno.read_by_code_ids(
                        db=db, code_ids=selected_code_ids
                    )
                    if sa.user_id
                    not in SYSTEM_USER_IDS  # Filter out annotations of the system users
                ]

                # 2. Find the code names
                codes = crud_code.read_by_ids(db=db, ids=selected_code_ids)
                code_id2name = {code.id: code.name for code in codes}

                # 3. Count annotations by code_id, get the code names
                code_id2num_sent_annos = {code.id: 0 for code in codes}
                for sent_anno in sentence_annotations:
                    code_id2num_sent_annos[sent_anno.code_id] += 1

                # 4. Determine the approach based on the minimum number of labeled sentences
                # 4.1 find the code with the least labeled sentences
                code_with_min_labeled_sentences = min(
                    code_id2num_sent_annos.keys(),
                    key=lambda k: code_id2num_sent_annos[k],
                )
                min_labeled_sentences = code_id2num_sent_annos[
                    code_with_min_labeled_sentences
                ]

                # 4.2 create reasoning
                reasoning = f"You selected {len(selected_code_ids)} codes. I checked the number of labeled sentences for each code and found:\n"
                code_counts = []
                for code_id, num_labeled_sentences in code_id2num_sent_annos.items():
                    code_counts.append(
                        f"{code_id2name[code_id]}: {num_labeled_sentences}"
                    )
                reasoning += "\n".join(code_counts)
                reasoning += f"\nThe code with the least labeled sentences ({min_labeled_sentences}) is {code_id2name[code_with_min_labeled_sentences]}. Based on this, I recommend the following approach:"

                # 4.3 determine the available approaches based on thresholds
                available_approaches: dict[ApproachType, bool] = {
                    ApproachType.LLM_ZERO_SHOT: True,
                    ApproachType.LLM_FEW_SHOT: min_labeled_sentences
                    >= lac.few_shot_threshold,
                }

                # 4.4 determine the recommended approach based on thresholds
                if min_labeled_sentences < lac.few_shot_threshold:
                    recommended_approach = ApproachType.LLM_ZERO_SHOT
                else:
                    recommended_approach = ApproachType.LLM_FEW_SHOT

                return ApproachRecommendation(
                    recommended_approach=recommended_approach,
                    available_approaches=available_approaches,
                    reasoning=reasoning,
                )

    # --- MISC ---

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
        return list_strategies(task_type)

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
        strategy = self._build_strategy(
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
