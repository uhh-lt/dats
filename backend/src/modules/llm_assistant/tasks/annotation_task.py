from loguru import logger
from pydantic import BaseModel

from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_annotation_dto import (
    SpanAnnotationCreate,
)
from core.annotation.span_annotation_service import SpanAnnotationService
from core.prompt_template.prompt_template_enum import TaskType
from core.user.user_crud import (
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_ZEROSHOT_ID,
)
from modules.llm_assistant.llm_assistant_job_dto import (
    AnnotationLLMAssistantJobResult,
    AnnotationResult,
)
from modules.llm_assistant.strategies.fuzzy_grounding_strategy import (
    FuzzyGroundingStrategy,
)
from modules.llm_assistant.strategies.ner_inline_tag_strategy import (
    NERInlineTagStrategy,
)
from modules.llm_assistant.tasks.llm_assistant_document_processor import (
    LLMAssistantDocumentResponse,
)
from modules.llm_assistant.tasks.llm_assistant_task import (
    LLMAssistantTask,
    LLMAssistantTaskContext,
    aggregate_raw_responses,
)

AnnotationStrategy = NERInlineTagStrategy | FuzzyGroundingStrategy


class AnnotationTask(LLMAssistantTask[AnnotationStrategy, BaseModel, AnnotationResult]):
    """Span annotation task.

    Supports two strategies:
    - NERInlineTagStrategy: LLM repeats text with inline XML tags.
    - FuzzyGroundingStrategy: LLM extracts structured passages; backend grounds them.
    """

    task_name = "Annotation"
    task_type = TaskType.ANNOTATION

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
    def _to_span_annotation(
        *,
        sdoc_id: int,
        code_id: int,
        begin: int,
        end: int,
        text: str,
        document_token_map: dict[int, int],
    ) -> SpanAnnotationCreate | None:
        """The span annotation of a suggested span, None if the span is blank, does
        not map to tokens or covers no character or token (span annotations must not
        be empty, so such a suggestion is skipped instead of failing the job)."""
        if text.strip() == "" or begin >= end:
            return None
        begin_token = document_token_map.get(begin)
        last_token = document_token_map.get(end - 1)
        if begin_token is None or last_token is None or begin_token > last_token:
            return None
        return SpanAnnotationCreate(
            sdoc_id=sdoc_id,
            begin=begin,
            end=end,
            begin_token=begin_token,
            # end_token is exclusive
            end_token=last_token + 1,
            span_text=text,
            code_id=code_id,
        )

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

    def _prepare(
        self,
        context: LLMAssistantTaskContext[AnnotationStrategy],
    ) -> None:
        if not context.payload.delete_existing_annotations:
            return

        deleted_ids = crud_span_anno.delete_by_user_sdocs_codes(
            db=context.db,
            user_id=ASSISTANT_FEWSHOT_ID
            if context.is_fewshot
            else ASSISTANT_ZEROSHOT_ID,
            sdoc_ids=context.payload.sdoc_ids,
            code_ids=list(context.strategy.codeid2code),
        )
        logger.info("Deleted {} previous span annotations.", len(deleted_ids))

    def _get_response_model(self, strategy: AnnotationStrategy) -> type[BaseModel]:
        return strategy.get_response_model()

    def _process_document(
        self,
        *,
        context: LLMAssistantTaskContext[AnnotationStrategy],
        document: LLMAssistantDocumentResponse[BaseModel],
    ) -> AnnotationResult:
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
                if span["code_id"] not in strategy.codeid2code:
                    continue
                annotation = self._to_span_annotation(
                    sdoc_id=sdoc_data.id,
                    code_id=span["code_id"],
                    begin=span["begin"],
                    end=span["end"],
                    text=span["text"],
                    document_token_map=document_token_map,
                )
                if annotation is not None:
                    suggested_annotations.append(annotation)

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
        created_annos_for_sdoc = SpanAnnotationService().create_multi(
            db=context.db,
            user_id=ASSISTANT_FEWSHOT_ID
            if context.is_fewshot
            else ASSISTANT_ZEROSHOT_ID,
            create_dtos=suggested_annotations,
        )
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

    def _build_result(
        self, results: list[AnnotationResult]
    ) -> AnnotationLLMAssistantJobResult:
        return AnnotationLLMAssistantJobResult(
            task_type=TaskType.ANNOTATION, results=results
        )
