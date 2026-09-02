from loguru import logger
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
    ZeroShotParams,
)
from modules.llm_assistant.strategies.fuzzy_grounding_strategy import (
    FuzzyGroundingStrategy,
)
from modules.llm_assistant.strategies.ner_inline_tag_strategy import (
    NERInlineTagStrategy,
)
from modules.llm_assistant.tasks.llm_task import (
    BATCH_SIZE,
    BatchProcessingError,
    LLMTask,
    aggregate_raw_responses,
)
from systems.job_system.job_dto import Job


class AnnotationTask(LLMTask):
    """Span annotation task.

    Supports two strategies:
    - NERInlineTagStrategy: LLM repeats text with inline XML tags.
    - FuzzyGroundingStrategy: LLM extracts text passages as JSON; backend grounds them.
    """

    @staticmethod
    def _dedupe_annotations(
        annotations: list[SpanAnnotationCreate],
    ) -> list[SpanAnnotationCreate]:
        """Remove exact duplicate suggestions while preserving their order."""
        seen: set[tuple[int, int, int, int]] = set()
        result: list[SpanAnnotationCreate] = []
        for annotation in annotations:
            key = (
                annotation.sdoc_id,
                annotation.code_id,
                annotation.begin,
                annotation.end,
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

    def execute(
        self,
        *,
        db: Session,
        job: Job,
        project_id: int,
        approach_parameters: ZeroShotParams | FewShotParams,
        task_parameters: AnnotationParams,
        strategy: NERInlineTagStrategy | FuzzyGroundingStrategy,
    ) -> LLMJobOutput:
        is_fewshot = isinstance(approach_parameters, FewShotParams)

        msg = (
            f"Started LLMJob - Annotation ({'Few-Shot' if is_fewshot else 'Zero-Shot'}), "
            f"num docs: {len(task_parameters.sdoc_ids)}"
        )
        self._update_llm_job_description(job=job, description=msg)
        logger.info(msg)

        project_codes = strategy.codeids2code_dict

        # read sdocs
        sdoc_datas = self._read_sdoc_datas(db, task_parameters.sdoc_ids)

        # Delete all existing span annotations for the sdocs
        if task_parameters.delete_existing_annotations:
            previous_annotations = crud_span_anno.read_by_user_sdocs_codes(
                db=db,
                user_id=ASSISTANT_FEWSHOT_ID if is_fewshot else ASSISTANT_ZEROSHOT_ID,
                sdoc_ids=task_parameters.sdoc_ids,
                code_ids=task_parameters.code_ids,
            )

            msg = f"Deleting {len(previous_annotations)} previous span annotations."
            logger.info(msg)

            crud_span_anno.remove_bulk(
                db=db, ids=[anno.id for anno in previous_annotations]
            )

        # automatic annotation
        result: list[AnnotationResult] = []
        for batch_idx, num_batches, sids in self._iter_batches(
            task_parameters.sdoc_ids
        ):
            # update job status
            msg = f"Processing batch {batch_idx + 1} of {num_batches}"
            self._next_llm_job_step(job=job, description=msg)
            logger.info(msg)

            # batch data
            start = batch_idx * BATCH_SIZE
            sdata = sdoc_datas[start : start + BATCH_SIZE]
            sid2sdata = {
                sdoc_data.id: sdoc_data for sdoc_data in sdata if sdoc_data is not None
            }

            # process the batch with LLM
            try:
                responses, response_sdoc_ids, response_message_ids = (
                    self._process_batch(
                        model=approach_parameters.model,
                        strategy=strategy,
                        db=db,
                        sdoc_ids=sids,
                        sdoc_datas=sdata,
                        response_model=strategy.get_response_model(),
                    )
                )
            except BatchProcessingError as e:
                logger.error(f"Batch processing failed: {e}")
                result.extend(
                    [
                        AnnotationResult(
                            status="error",
                            status_message=str(e),
                            sdoc_id=sdoc_id,
                            suggested_annotations=[],
                            raw_response=e.raw_response,
                        )
                        for sdoc_id in sids
                    ]
                )
                continue

            # parse the responses, preparing the suggested annotation creation
            suggested_annotations: list[SpanAnnotationCreate] = []
            # raw responses per sdoc (only kept for docs without annotations)
            # note: a document can have multiple responses (one per sentence/chunk)
            sdoc_id2raw_responses: dict[int, list[str]] = {}
            # errors per sdoc
            sdoc_id2errors: dict[int, list[tuple[str, str | None]]] = {}
            for response, sdoc_id, message_id in zip(
                responses, response_sdoc_ids, response_message_ids
            ):
                sdoc_data = sid2sdata.get(sdoc_id, None)
                assert sdoc_data is not None

                if response.is_error or response.parsed is None:
                    if sdoc_id not in sdoc_id2errors:
                        sdoc_id2errors[sdoc_id] = []
                    sdoc_id2errors[sdoc_id].append(
                        (
                            response.error or "Unknown LLM error",
                            response.raw,
                        )
                    )
                    continue

                if response.raw is not None:
                    if sdoc_id not in sdoc_id2raw_responses:
                        sdoc_id2raw_responses[sdoc_id] = []
                    sdoc_id2raw_responses[sdoc_id].append(response.raw)

                # parse the response into spans with absolute char offsets
                parsed_spans = strategy.parse_result(
                    response.parsed,  # type: ignore
                    sdoc_data,
                    message_id,
                )

                # build char->token map
                document_token_map = {}
                last_character_offset = 0
                for token_id, token_end in enumerate(sdoc_data.token_ends):
                    for i in range(last_character_offset, token_end):
                        document_token_map[i] = token_id
                    last_character_offset = token_end

                for span in parsed_spans:
                    code_id = span["code_id"]
                    if code_id not in project_codes:
                        continue

                    if span["text"].strip() == "":
                        continue

                    start = span["begin"]
                    end = span["end"]

                    begin_token = document_token_map.get(start)
                    end_token = document_token_map.get(end - 1)
                    if begin_token is None or end_token is None:
                        continue

                    # create the suggested annotation
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

            # Deduplicate after all responses for the document batch have been parsed.
            suggested_annotations = self._dedupe_annotations(suggested_annotations)

            # create the suggested annotations in the database
            created_annos = crud_span_anno.create_bulk(
                db=db,
                user_id=ASSISTANT_FEWSHOT_ID if is_fewshot else ASSISTANT_ZEROSHOT_ID,
                create_dtos=suggested_annotations,
            )

            # create results for this batch
            sdoc_id2created_annos: dict[int, list[SpanAnnotationRead]] = {}
            for anno in created_annos:
                if anno.sdoc_id not in sdoc_id2created_annos:
                    sdoc_id2created_annos[anno.sdoc_id] = []
                sdoc_id2created_annos[anno.sdoc_id].append(
                    SpanAnnotationRead.model_validate(anno)
                )

            # create a result for EVERY processed document
            for sdoc_id in sids:
                created_annos_for_sdoc = sdoc_id2created_annos.get(sdoc_id, [])
                errors = sdoc_id2errors.get(sdoc_id, [])

                if errors:
                    # aggregate the raw responses of the failed requests
                    raw_response = aggregate_raw_responses(
                        [raw for _, raw in errors if raw is not None]
                    )
                    error_msg = (
                        errors[0][0]
                        if len(errors) == 1
                        else f"{len(errors)} requests failed. First error: {errors[0][0]}"
                    )
                    if created_annos_for_sdoc:
                        # partial success: some requests failed, but annotations exist
                        result.append(
                            AnnotationResult(
                                status="partial",
                                status_message=f"Annotation partially successful. {error_msg}",
                                sdoc_id=sdoc_id,
                                suggested_annotations=created_annos_for_sdoc,
                                raw_response=raw_response if raw_response else None,
                            )
                        )
                    else:
                        # complete failure: no annotations created
                        result.append(
                            AnnotationResult(
                                status="error",
                                status_message=error_msg,
                                sdoc_id=sdoc_id,
                                suggested_annotations=[],
                                raw_response=raw_response if raw_response else None,
                            )
                        )
                    continue

                if len(created_annos_for_sdoc) > 0:
                    # success results
                    result.append(
                        AnnotationResult(
                            status="finished",
                            status_message="Annotation successful",
                            sdoc_id=sdoc_id,
                            suggested_annotations=created_annos_for_sdoc,
                        )
                    )
                else:
                    # no annotations suggested -> keep raw responses for transparency
                    raw_responses = sdoc_id2raw_responses.get(sdoc_id, [])
                    result.append(
                        AnnotationResult(
                            status="finished",
                            status_message="No annotations suggested",
                            sdoc_id=sdoc_id,
                            suggested_annotations=[],
                            raw_response=(
                                aggregate_raw_responses(raw_responses)
                                if raw_responses
                                else None
                            ),
                        )
                    )

        return LLMJobOutput(
            llm_job_type=TaskType.ANNOTATION,
            specific_task_result=AnnotationLLMJobResult(
                llm_job_type=TaskType.ANNOTATION, results=result
            ),
        )
