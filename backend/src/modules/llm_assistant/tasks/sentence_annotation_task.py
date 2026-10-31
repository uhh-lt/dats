from loguru import logger

from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationCreate,
)
from core.annotation.sentence_annotation_service import SentenceAnnotationService
from core.prompt_template.prompt_template_enum import TaskType
from modules.llm_assistant.llm_assistant_job_dto import (
    SentenceAnnotationLLMAssistantJobResult,
    SentenceAnnotationResult,
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
        LLMSentenceAnnotationResults,
        SentenceAnnotationResult,
    ]
):
    """Generate sentence-level annotation suggestions for source documents."""

    task_name = "Sentence Annotation"
    task_type = TaskType.SENTENCE_ANNOTATION

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

    def _prepare(
        self,
        context: LLMAssistantTaskContext[SentenceAnnotationStrategy],
    ) -> None:
        if not context.payload.delete_existing_annotations:
            return

        deleted_ids = crud_sentence_anno.delete_by_user_sdocs_codes(
            db=context.db,
            user_id=context.virtual_user_id,
            sdoc_ids=context.payload.sdoc_ids,
            code_ids=list(context.strategy.codeid2code),
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
        context: LLMAssistantTaskContext[SentenceAnnotationStrategy],
        document: LLMAssistantDocumentResponse[LLMSentenceAnnotationResults],
    ) -> SentenceAnnotationResult:
        strategy = context.strategy
        sdoc_data = document.sdoc_data
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

            parsed_items.extend(
                strategy.parse_result(
                    result=response.parsed,
                    sdoc_data=sdoc_data,
                    message_id=response_item.message_id,
                )
            )

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
            user_id=context.virtual_user_id,
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

    def _build_result(
        self, results: list[SentenceAnnotationResult]
    ) -> SentenceAnnotationLLMAssistantJobResult:
        return SentenceAnnotationLLMAssistantJobResult(
            task_type=TaskType.SENTENCE_ANNOTATION, results=results
        )
