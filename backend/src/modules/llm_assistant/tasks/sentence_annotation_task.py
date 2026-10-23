from loguru import logger
from sqlalchemy.orm import Session

from config import conf
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationCreate,
)
from core.annotation.sentence_annotation_service import SentenceAnnotationService
from core.code.code_crud import crud_code
from core.user.user_crud import (
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_ZEROSHOT_ID,
    SYSTEM_USER_IDS,
)
from modules.llm_assistant.llm_assistant_enum import ApproachType, DataTag, TaskType
from modules.llm_assistant.llm_assistant_job_dto import (
    ApproachRecommendation,
    FewShotParams,
    LLMAssistantJobOutput,
    SentenceAnnotationLLMAssistantJobResult,
    SentenceAnnotationParams,
    SentenceAnnotationResult,
    SpecificTaskParameters,
)
from modules.llm_assistant.strategies.sentence_annotation_strategy import (
    LLMSentenceAnnotationResults,
    SentenceAnnotationStrategy,
)
from modules.llm_assistant.tasks.llm_assistant_document_processor import (
    LLMAssistantDocumentResponse,
)
from modules.llm_assistant.tasks.llm_assistant_task import (
    LLMAssistantTask,
    LLMAssistantTaskContext,
    aggregate_raw_responses,
)


class SentenceAnnotationTask(
    LLMAssistantTask[
        SentenceAnnotationStrategy,
        SentenceAnnotationParams,
        LLMSentenceAnnotationResults,
        SentenceAnnotationResult,
    ]
):
    """Generate sentence-level annotation suggestions for source documents."""

    task_name = "Sentence Annotation"

    @staticmethod
    def _group_into_ranges(
        parsed_items: list[tuple[int, int]],
    ) -> list[tuple[int, int, int]]:
        """Merge (sentence_id, code_id) pairs into (start, end, code_id) ranges.

        The sentences of each code are sorted and every run of consecutive
        sentences becomes one range. The LLM may return the pairs in any order.
        """
        sentence_ids_by_code: dict[int, set[int]] = {}
        for sentence_id, code_id in parsed_items:
            sentence_ids_by_code.setdefault(code_id, set()).add(sentence_id)

        ranges: list[tuple[int, int, int]] = []
        for code_id, sentence_ids in sentence_ids_by_code.items():
            sorted_ids = sorted(sentence_ids)
            start = previous = sorted_ids[0]
            for sentence_id in sorted_ids[1:]:
                if sentence_id != previous + 1:
                    ranges.append((start, previous, code_id))
                    start = sentence_id
                previous = sentence_id
            ranges.append((start, previous, code_id))

        return sorted(ranges)

    @staticmethod
    def _dedupe_annotations(
        annotations: list[SentenceAnnotationCreate],
    ) -> list[SentenceAnnotationCreate]:
        """Remove exact duplicate suggestions while preserving their order."""
        seen: set[tuple[int, int, int, int]] = set()
        result: list[SentenceAnnotationCreate] = []
        for annotation in annotations:
            key = (
                annotation.sdoc_id,
                annotation.code_id,
                annotation.sentence_id_start,
                annotation.sentence_id_end,
            )
            if key in seen:
                continue
            seen.add(key)
            result.append(annotation)
        return result

    @classmethod
    def determine_approach(
        cls, db: Session, task_parameters: SpecificTaskParameters
    ) -> ApproachRecommendation:
        """Recommend few-shot annotation when every selected code has enough examples."""
        assert isinstance(task_parameters, SentenceAnnotationParams)
        selected_code_ids = task_parameters.code_ids

        # 1. Find the number of sentence annotations for each code
        sentence_annotations = [
            sa
            for sa in crud_sentence_anno.read_by_code_ids(
                db=db, code_ids=selected_code_ids
            )
            if sa.user_id not in SYSTEM_USER_IDS  # exclude system / assistant users
        ]

        # 2. Find the code names
        codes = crud_code.read_by_ids(db=db, ids=selected_code_ids)
        code_id2name = {code.id: code.name for code in codes}

        # 3. Count annotations by code_id
        code_id2num_sent_annos = {code.id: 0 for code in codes}
        for sent_anno in sentence_annotations:
            code_id2num_sent_annos[sent_anno.code_id] += 1

        # 4. Determine the minimum number of sentence annotations
        code_with_fewest_sentence_annotations = min(
            code_id2num_sent_annos.keys(),
            key=lambda k: code_id2num_sent_annos[k],
        )
        min_sentence_annotations = code_id2num_sent_annos[
            code_with_fewest_sentence_annotations
        ]

        # 5. Create reasoning
        reasoning = (
            f"You selected {len(selected_code_ids)} codes. "
            "I checked the number of sentence annotations for each code and found:\n"
        )
        code_counts = []
        for code_id, num_labeled_sentences in code_id2num_sent_annos.items():
            code_counts.append(f"{code_id2name[code_id]}: {num_labeled_sentences}")
        reasoning += "\n".join(code_counts)
        reasoning += (
            "\nThe code with the fewest sentence annotations "
            f"({min_sentence_annotations}) is "
            f"{code_id2name[code_with_fewest_sentence_annotations]}. "
            "Based on this, I recommend the following approach:"
        )

        # 6. Determine available approaches
        available_approaches: dict[ApproachType, bool] = {
            ApproachType.LLM_ZERO_SHOT: True,
            ApproachType.LLM_FEW_SHOT: min_sentence_annotations
            >= conf.llm_assistant.few_shot_threshold,
        }

        # 7. Determine recommended approach
        if min_sentence_annotations < conf.llm_assistant.few_shot_threshold:
            recommended_approach = ApproachType.LLM_ZERO_SHOT
        else:
            recommended_approach = ApproachType.LLM_FEW_SHOT

        return ApproachRecommendation(
            recommended_approach=recommended_approach,
            available_approaches=available_approaches,
            reasoning=reasoning,
        )

    def _prepare(
        self,
        context: LLMAssistantTaskContext[
            SentenceAnnotationStrategy, SentenceAnnotationParams
        ],
    ) -> None:
        if not context.task_parameters.delete_existing_annotations:
            return

        is_fewshot = isinstance(context.approach_parameters, FewShotParams)
        deleted_ids = crud_sentence_anno.delete_by_user_sdocs_codes(
            db=context.db,
            user_id=ASSISTANT_FEWSHOT_ID if is_fewshot else ASSISTANT_ZEROSHOT_ID,
            sdoc_ids=context.task_parameters.sdoc_ids,
            code_ids=context.task_parameters.code_ids,
        )
        logger.info("Deleted {} previous sentence annotations.", len(deleted_ids))

    def _get_response_model(
        self, strategy: SentenceAnnotationStrategy
    ) -> type[LLMSentenceAnnotationResults]:
        """Return the structured response model for sentence annotation."""
        return LLMSentenceAnnotationResults

    def _process_document(
        self,
        *,
        context: LLMAssistantTaskContext[
            SentenceAnnotationStrategy, SentenceAnnotationParams
        ],
        document: LLMAssistantDocumentResponse[LLMSentenceAnnotationResults],
    ) -> SentenceAnnotationResult:
        is_fewshot = isinstance(context.approach_parameters, FewShotParams)
        strategy = context.strategy
        sdoc_data = document.sdoc_data
        num_sentences = len(sdoc_data.sentences)
        # (sentence_id, code_id) pairs of all responses, merged into ranges below
        parsed_items: list[tuple[int, int]] = []
        raw_responses: list[str] = []
        errors: list[tuple[str, str | None]] = []
        for response_item in document.responses:
            response = response_item.response
            if response.is_error or response.parsed is None:
                errors.append(
                    (
                        response.error or "Unknown LLM error",
                        response.raw,
                    )
                )
                continue

            if response.raw is not None:
                raw_responses.append(response.raw)

            parsed_response = strategy.parse_result(result=response.parsed)
            match strategy.data_tag:
                case DataTag.SENTENCE:
                    parsed_items.extend(
                        (
                            response_item.message_id,
                            annotation.code_id,
                        )
                        for annotation in parsed_response
                        if annotation.code_id in strategy.codeids2code_dict
                    )
                case DataTag.DOCUMENT:
                    parsed_items.extend(
                        (
                            annotation.sent_id - 1,
                            annotation.code_id,
                        )
                        for annotation in parsed_response
                        if annotation.code_id in strategy.codeids2code_dict
                        and annotation.sent_id > 0
                        and annotation.sent_id <= num_sentences
                    )
                case _:
                    raise ValueError("Unknown DataTag!")  # type: ignore

        suggested_annotations = [
            SentenceAnnotationCreate(
                sdoc_id=sdoc_data.id,
                sentence_id_start=sentence_id_start,
                sentence_id_end=sentence_id_end,
                code_id=code_id,
            )
            for sentence_id_start, sentence_id_end, code_id in self._group_into_ranges(
                parsed_items
            )
        ]

        parsed_annotation_count = len(suggested_annotations)
        logger.debug(
            "--- Sentence annotations before deduplication: document {} ({} total) ---\n{}",
            sdoc_data.id,
            parsed_annotation_count,
            "\n".join(repr(annotation) for annotation in suggested_annotations)
            or "<none>",
        )
        suggested_annotations = self._dedupe_annotations(suggested_annotations)
        deduplicated_annotation_count = len(suggested_annotations)
        logger.debug(
            "--- Sentence annotations after deduplication: document {} ({} total) ---\n{}",
            sdoc_data.id,
            deduplicated_annotation_count,
            "\n".join(repr(annotation) for annotation in suggested_annotations)
            or "<none>",
        )
        logger.info(
            "Document {} produced {} sentence annotation suggestion(s), {} after deduplication, with {} failed response(s).",
            sdoc_data.id,
            parsed_annotation_count,
            deduplicated_annotation_count,
            len(errors),
        )
        created_annos_for_sdoc = SentenceAnnotationService().create_multi(
            db=context.db,
            user_id=ASSISTANT_FEWSHOT_ID if is_fewshot else ASSISTANT_ZEROSHOT_ID,
            create_dtos=suggested_annotations,
        )
        logger.info(
            "Created {} sentence annotation(s) for document {}.",
            len(created_annos_for_sdoc),
            sdoc_data.id,
        )

        if errors:
            raw_response = aggregate_raw_responses(
                [raw for _, raw in errors if raw is not None]
            )
            error_msg = (
                errors[0][0]
                if len(errors) == 1
                else f"{len(errors)} requests failed. First error: {errors[0][0]}"
            )
            if created_annos_for_sdoc:
                return SentenceAnnotationResult(
                    status="partial",
                    status_message=f"Sentence annotation partially successful. {error_msg}",
                    sdoc_id=sdoc_data.id,
                    suggested_annotations=created_annos_for_sdoc,
                    raw_response=raw_response or None,
                )
            return SentenceAnnotationResult(
                status="error",
                status_message=error_msg,
                sdoc_id=sdoc_data.id,
                suggested_annotations=[],
                raw_response=raw_response or None,
            )

        if created_annos_for_sdoc:
            return SentenceAnnotationResult(
                status="finished",
                status_message="Sentence annotation successful",
                sdoc_id=sdoc_data.id,
                suggested_annotations=created_annos_for_sdoc,
            )

        return SentenceAnnotationResult(
            status="finished",
            status_message="No annotations suggested",
            sdoc_id=sdoc_data.id,
            suggested_annotations=[],
            raw_response=(
                aggregate_raw_responses(raw_responses) if raw_responses else None
            ),
        )

    def _build_output(
        self, results: list[SentenceAnnotationResult]
    ) -> LLMAssistantJobOutput:
        return LLMAssistantJobOutput(
            task_type=TaskType.SENTENCE_ANNOTATION,
            specific_task_result=SentenceAnnotationLLMAssistantJobResult(
                task_type=TaskType.SENTENCE_ANNOTATION, results=results
            ),
        )
