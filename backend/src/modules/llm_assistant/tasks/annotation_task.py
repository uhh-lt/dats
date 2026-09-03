from loguru import logger
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import conf
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import (
    SpanAnnotationCreate,
    SpanAnnotationRead,
)
from core.code.code_crud import crud_code
from core.user.user_crud import (
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_ZEROSHOT_ID,
    SYSTEM_USER_IDS,
)
from modules.llm_assistant.llm_job_dto import (
    AnnotationLLMJobResult,
    AnnotationParams,
    AnnotationResult,
    ApproachRecommendation,
    ApproachType,
    FewShotParams,
    LLMJobOutput,
    SpecificTaskParameters,
    TaskType,
)
from modules.llm_assistant.strategies.fuzzy_grounding_strategy import (
    FuzzyGroundingStrategy,
)
from modules.llm_assistant.strategies.ner_inline_tag_strategy import (
    NERInlineTagStrategy,
)
from modules.llm_assistant.tasks.llm_document_processor import LLMDocumentResponse
from modules.llm_assistant.tasks.llm_task import (
    LLMTask,
    LLMTaskContext,
    aggregate_raw_responses,
)

AnnotationStrategy = NERInlineTagStrategy | FuzzyGroundingStrategy


class AnnotationTask(
    LLMTask[AnnotationStrategy, AnnotationParams, BaseModel, AnnotationResult]
):
    """Span annotation task.

    Supports two strategies:
    - NERInlineTagStrategy: LLM repeats text with inline XML tags.
    - FuzzyGroundingStrategy: LLM extracts structured passages; backend grounds them.
    """

    task_name = "Annotation"

    @staticmethod
    def _dedupe_annotations(
        annotations: list[SpanAnnotationCreate],
        document_content: str,
    ) -> tuple[list[SpanAnnotationCreate], list[SpanAnnotationCreate]]:
        """Merge overlapping suggestions for the same document and code."""
        sorted_annotations = sorted(
            annotations,
            key=lambda annotation: (
                annotation.sdoc_id,
                annotation.code_id,
                annotation.begin,
                annotation.end,
            ),
        )
        kept: list[SpanAnnotationCreate] = []
        removed: list[SpanAnnotationCreate] = []
        for annotation in sorted_annotations:
            if len(kept) == 0:
                kept.append(annotation)
                continue

            previous = kept[-1]
            is_same_group = (
                previous.sdoc_id == annotation.sdoc_id
                and previous.code_id == annotation.code_id
            )
            is_overlapping = (
                annotation.begin < previous.end and previous.begin < annotation.end
            )
            if not is_same_group or not is_overlapping:
                kept.append(annotation)
                continue

            begin = min(previous.begin, annotation.begin)
            end = max(previous.end, annotation.end)
            kept[-1] = SpanAnnotationCreate(
                sdoc_id=previous.sdoc_id,
                code_id=previous.code_id,
                begin=begin,
                end=end,
                begin_token=min(previous.begin_token, annotation.begin_token),
                end_token=max(previous.end_token, annotation.end_token),
                span_text=document_content[begin:end],
            )
            removed.append(annotation)

        return kept, removed

    @staticmethod
    def _annotation_key(annotation: SpanAnnotationCreate) -> tuple[int, int, int, int]:
        return (
            annotation.sdoc_id,
            annotation.code_id,
            annotation.begin,
            annotation.end,
        )

    @classmethod
    def _format_annotation(cls, annotation: SpanAnnotationCreate) -> str:
        compact_text = " ".join(annotation.span_text.split())
        preview = (
            compact_text if len(compact_text) <= 100 else f"{compact_text[:97]}..."
        )
        return (
            f"key={cls._annotation_key(annotation)}, code={annotation.code_id}, "
            f"chars={annotation.begin}:{annotation.end}, "
            f"tokens={annotation.begin_token}:{annotation.end_token}, "
            f"length={annotation.end - annotation.begin}, preview={preview!r}"
        )

    @classmethod
    def determine_approach(
        cls, db: Session, task_parameters: SpecificTaskParameters
    ) -> ApproachRecommendation:
        assert isinstance(task_parameters, AnnotationParams)
        selected_code_ids = task_parameters.code_ids

        # 1. Find the number of labeled spans for each code
        span_annotations = [
            sa
            for sa in crud_span_anno.read_by_codes(db=db, code_ids=selected_code_ids)
            if sa.user_id not in SYSTEM_USER_IDS  # exclude system / assistant users
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
            >= conf.llm_assistant.few_shot_threshold,
        }

        # 7. Determine recommended approach
        if min_labeled_spans < conf.llm_assistant.few_shot_threshold:
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
        context: LLMTaskContext[AnnotationStrategy, AnnotationParams],
    ) -> None:
        if not context.task_parameters.delete_existing_annotations:
            return

        is_fewshot = isinstance(context.approach_parameters, FewShotParams)
        previous_annotations = crud_span_anno.read_by_user_sdocs_codes(
            db=context.db,
            user_id=ASSISTANT_FEWSHOT_ID if is_fewshot else ASSISTANT_ZEROSHOT_ID,
            sdoc_ids=context.task_parameters.sdoc_ids,
            code_ids=context.task_parameters.code_ids,
        )

        logger.info("Deleting {} previous span annotations.", len(previous_annotations))
        crud_span_anno.remove_bulk(
            db=context.db, ids=[annotation.id for annotation in previous_annotations]
        )

    def _get_response_model(self, strategy: AnnotationStrategy) -> type[BaseModel]:
        return strategy.get_response_model()

    def _process_document(
        self,
        *,
        context: LLMTaskContext[AnnotationStrategy, AnnotationParams],
        document: LLMDocumentResponse[BaseModel],
    ) -> AnnotationResult:
        is_fewshot = isinstance(context.approach_parameters, FewShotParams)
        strategy = context.strategy
        sdoc_data = document.sdoc_data
        suggested_annotations: list[SpanAnnotationCreate] = []
        raw_responses: list[str] = []
        errors: list[tuple[str, str | None]] = []
        document_token_map: dict[int, int] = {}
        last_character_offset = 0
        for token_id, token_end in enumerate(sdoc_data.token_ends):
            for character_offset in range(last_character_offset, token_end):
                document_token_map[character_offset] = token_id
            last_character_offset = token_end

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

            parsed_spans = strategy.parse_result(
                response.parsed,  # type: ignore
                sdoc_data,
                response_item.message_id,
            )
            for span in parsed_spans:
                code_id = span["code_id"]
                if code_id not in strategy.codeids2code_dict:
                    continue
                if span["text"].strip() == "":
                    continue

                start = span["begin"]
                end = span["end"]
                begin_token = document_token_map.get(start)
                end_token = document_token_map.get(end - 1)
                if begin_token is None or end_token is None:
                    continue

                suggested_annotations.append(
                    SpanAnnotationCreate(
                        sdoc_id=sdoc_data.id,
                        begin=start,
                        end=end,
                        begin_token=begin_token,
                        end_token=end_token + 1,
                        span_text=span["text"],
                        code_id=code_id,
                    )
                )

        parsed_annotation_count = len(suggested_annotations)
        suggested_annotations, removed_annotations = self._dedupe_annotations(
            suggested_annotations,
            document_content=sdoc_data.content,
        )
        deduplicated_annotation_count = len(suggested_annotations)
        logger.debug(
            "--- Span annotation deduplication: document {} ---\nKept ({}):\n{}\nRemoved ({}):\n{}",
            sdoc_data.id,
            deduplicated_annotation_count,
            "\n".join(
                self._format_annotation(annotation)
                for annotation in suggested_annotations
            )
            or "<none>",
            len(removed_annotations),
            "\n".join(
                self._format_annotation(annotation)
                for annotation in removed_annotations
            )
            or "<none>",
        )
        logger.info(
            "Document {} produced {} annotation suggestion(s), {} after deduplication, with {} failed response(s).",
            sdoc_data.id,
            parsed_annotation_count,
            deduplicated_annotation_count,
            len(errors),
        )
        created_annos = crud_span_anno.create_bulk(
            db=context.db,
            user_id=ASSISTANT_FEWSHOT_ID if is_fewshot else ASSISTANT_ZEROSHOT_ID,
            create_dtos=suggested_annotations,
        )
        created_annos_for_sdoc = [
            SpanAnnotationRead.model_validate(annotation)
            for annotation in created_annos
        ]
        logger.info(
            "Created {} span annotation(s) for document {}.",
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
                return AnnotationResult(
                    status="partial",
                    status_message=f"Annotation partially successful. {error_msg}",
                    sdoc_id=sdoc_data.id,
                    suggested_annotations=created_annos_for_sdoc,
                    raw_response=raw_response or None,
                )
            return AnnotationResult(
                status="error",
                status_message=error_msg,
                sdoc_id=sdoc_data.id,
                suggested_annotations=[],
                raw_response=raw_response or None,
            )

        if created_annos_for_sdoc:
            return AnnotationResult(
                status="finished",
                status_message="Annotation successful",
                sdoc_id=sdoc_data.id,
                suggested_annotations=created_annos_for_sdoc,
            )

        return AnnotationResult(
            status="finished",
            status_message="No annotations suggested",
            sdoc_id=sdoc_data.id,
            suggested_annotations=[],
            raw_response=(
                aggregate_raw_responses(raw_responses) if raw_responses else None
            ),
        )

    def _build_output(self, results: list[AnnotationResult]) -> LLMJobOutput:
        return LLMJobOutput(
            llm_job_type=TaskType.ANNOTATION,
            specific_task_result=AnnotationLLMJobResult(
                llm_job_type=TaskType.ANNOTATION, results=results
            ),
        )
