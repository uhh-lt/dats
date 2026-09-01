from loguru import logger
from sqlalchemy.orm import Session

from config import conf
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationCreate,
    SentenceAnnotationRead,
)
from core.code.code_crud import crud_code
from core.user.user_crud import (
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_ZEROSHOT_ID,
    SYSTEM_USER_IDS,
)
from modules.llm_assistant.llm_job_dto import (
    ApproachRecommendation,
    ApproachType,
    FewShotParams,
    LLMJobOutput,
    SentenceAnnotationLLMJobResult,
    SentenceAnnotationParams,
    SentenceAnnotationResult,
    SpecificTaskParameters,
    TaskType,
    ZeroShotParams,
)
from modules.llm_assistant.prompts.data_tag import DataTag
from modules.llm_assistant.strategies.sentence_annotation_strategy import (
    LLMSentenceAnnotationResults,
    SentenceAnnotationStrategy,
)
from modules.llm_assistant.tasks.llm_task import (
    BATCH_SIZE,
    BatchProcessingError,
    LLMTask,
    aggregate_raw_responses,
)
from systems.job_system.job_dto import Job


class SentenceAnnotationTask(
    LLMTask[SentenceAnnotationStrategy, SentenceAnnotationParams]
):
    @classmethod
    def determine_approach(
        cls, db: Session, task_parameters: SpecificTaskParameters
    ) -> ApproachRecommendation:
        assert isinstance(task_parameters, SentenceAnnotationParams)
        selected_code_ids = task_parameters.code_ids

        # 1. Find the number of labeled sentences for each code
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

        # 4. Determine the minimum number of labeled sentences
        code_with_min_labeled_sentences = min(
            code_id2num_sent_annos.keys(),
            key=lambda k: code_id2num_sent_annos[k],
        )
        min_labeled_sentences = code_id2num_sent_annos[code_with_min_labeled_sentences]

        # 5. Create reasoning
        reasoning = (
            f"You selected {len(selected_code_ids)} codes. "
            "I checked the number of labeled sentences for each code and found:\n"
        )
        code_counts = []
        for code_id, num_labeled_sentences in code_id2num_sent_annos.items():
            code_counts.append(f"{code_id2name[code_id]}: {num_labeled_sentences}")
        reasoning += "\n".join(code_counts)
        reasoning += (
            f"\nThe code with the least labeled sentences ({min_labeled_sentences}) "
            f"is {code_id2name[code_with_min_labeled_sentences]}. "
            "Based on this, I recommend the following approach:"
        )

        # 6. Determine available approaches
        available_approaches: dict[ApproachType, bool] = {
            ApproachType.LLM_ZERO_SHOT: True,
            ApproachType.LLM_FEW_SHOT: min_labeled_sentences
            >= conf.llm_assistant.few_shot_threshold,
        }

        # 7. Determine recommended approach
        if min_labeled_sentences < conf.llm_assistant.few_shot_threshold:
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
        task_parameters: SentenceAnnotationParams,
        strategy: SentenceAnnotationStrategy,
    ) -> LLMJobOutput:
        is_fewshot = isinstance(approach_parameters, FewShotParams)

        msg = f"Started LLMJob - Sentence Annotation (LLM), num docs: {len(task_parameters.sdoc_ids)}"
        self._update_llm_job_description(job=job, description=msg)
        logger.info(msg)

        project_codes = strategy.codeids2code_dict

        # read sdocs
        sdoc_datas = self._read_sdoc_datas(db, task_parameters.sdoc_ids)

        # Delete all existing sentence annotations for the sdocs
        if task_parameters.delete_existing_annotations:
            previous_annotations = crud_sentence_anno.read_by_user_sdocs_codes(
                db=db,
                user_id=ASSISTANT_FEWSHOT_ID if is_fewshot else ASSISTANT_ZEROSHOT_ID,
                sdoc_ids=task_parameters.sdoc_ids,
                code_ids=task_parameters.code_ids,
            )

            msg = f"Deleting {len(previous_annotations)} previous sentence annotations."
            logger.info(msg)

            crud_sentence_anno.delete_bulk(
                db=db, ids=[sa.id for sa in previous_annotations]
            )

        # automatic annotation
        results: list[SentenceAnnotationResult] = []
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
                responses, response_sdoc_ids, response_sentence_ids = (
                    self._process_batch(
                        model=approach_parameters.model,
                        strategy=strategy,
                        db=db,
                        sdoc_ids=sids,
                        sdoc_datas=sdata,
                        response_model=LLMSentenceAnnotationResults,
                    )
                )
            except BatchProcessingError as e:
                logger.error(f"Batch processing failed: {e}")
                results.extend(
                    [
                        SentenceAnnotationResult(
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
            suggested_annotations: list[SentenceAnnotationCreate] = []
            # raw responses per sdoc (only kept for docs without annotations)
            # note: a document can have multiple responses (one per sentence)
            sdoc_id2raw_responses: dict[int, list[str]] = {}
            # errors per sdoc
            sdoc_id2errors: dict[int, list[tuple[str, str | None]]] = {}
            for response, sdoc_id, sentence_id in zip(
                responses, response_sdoc_ids, response_sentence_ids
            ):
                sdoc_data = sid2sdata.get(sdoc_id, None)
                assert sdoc_data is not None
                num_sentences = len(sdoc_data.sentences)

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

                # parse the response
                parsed_response = strategy.parse_result(result=response.parsed)
                match strategy.data_tag:
                    case DataTag.SENTENCE:
                        # the prompt was constructed per sentence, so we know the sentence id
                        parsed_items = [
                            (
                                sentence_id,
                                annotation.code_id,
                            )
                            for annotation in parsed_response
                        ]
                    case DataTag.DOCUMENT:
                        # the prompt was constructed per document, so we have to rely on the generated output to get the sentence id
                        parsed_items = [
                            (
                                annotation.sent_id - 1,
                                annotation.code_id,
                            )  # LLM starts from 1, we start from 0
                            for annotation in parsed_response
                            if annotation.code_id in project_codes
                            and annotation.sent_id > 0
                            and annotation.sent_id <= num_sentences
                        ]
                    case _:
                        raise ValueError("Unknown DataTag!")  # type: ignore

                if len(parsed_items) == 0:
                    continue

                # create the suggested annotation
                start = parsed_items[0][0]
                previous_sentence_id = parsed_items[0][0]
                previous_code_id = parsed_items[0][1]
                if len(parsed_items) > 1:
                    for sentence_id, code_id in parsed_items[1:]:
                        # create annotation if sentence ids mismatch
                        if previous_sentence_id != sentence_id - 1:
                            suggested_annotations.append(
                                SentenceAnnotationCreate(
                                    sdoc_id=sdoc_data.id,
                                    sentence_id_start=start,
                                    sentence_id_end=previous_sentence_id,
                                    code_id=previous_code_id,
                                )
                            )
                            start = sentence_id

                        # create annotation if code ids mismatch
                        if previous_code_id != code_id:
                            suggested_annotations.append(
                                SentenceAnnotationCreate(
                                    sdoc_id=sdoc_data.id,
                                    sentence_id_start=start,
                                    sentence_id_end=previous_sentence_id,
                                    code_id=previous_code_id,
                                )
                            )
                            start = sentence_id

                        previous_sentence_id = sentence_id
                        previous_code_id = code_id

                # create the last annotation
                suggested_annotations.append(
                    SentenceAnnotationCreate(
                        sdoc_id=sdoc_data.id,
                        sentence_id_start=start,
                        sentence_id_end=previous_sentence_id,
                        code_id=previous_code_id,
                    )
                )
            logger.info(
                f"Parsed the response! suggested sentence annotations={suggested_annotations}"
            )

            # create the suggested annotations for this batch
            created_annos = crud_sentence_anno.create_bulk(
                db=db,
                user_id=ASSISTANT_FEWSHOT_ID if is_fewshot else ASSISTANT_ZEROSHOT_ID,
                create_dtos=suggested_annotations,
            )

            # create results for this batch
            sdoc_id2created_annos: dict[int, list[SentenceAnnotationRead]] = {}
            for anno in created_annos:
                if anno.sdoc_id not in sdoc_id2created_annos:
                    sdoc_id2created_annos[anno.sdoc_id] = []
                sdoc_id2created_annos[anno.sdoc_id].append(
                    SentenceAnnotationRead.model_validate(anno)
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
                        results.append(
                            SentenceAnnotationResult(
                                status="partial",
                                status_message=f"Sentence annotation partially successful. {error_msg}",
                                sdoc_id=sdoc_id,
                                suggested_annotations=created_annos_for_sdoc,
                                raw_response=raw_response if raw_response else None,
                            )
                        )
                    else:
                        # complete failure: no annotations created
                        results.append(
                            SentenceAnnotationResult(
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
                    results.append(
                        SentenceAnnotationResult(
                            status="finished",
                            status_message="Sentence annotation successful",
                            sdoc_id=sdoc_id,
                            suggested_annotations=created_annos_for_sdoc,
                        )
                    )
                else:
                    # no annotations suggested -> keep raw responses for transparency
                    raw_responses = sdoc_id2raw_responses.get(sdoc_id, [])
                    results.append(
                        SentenceAnnotationResult(
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
            llm_job_type=TaskType.SENTENCE_ANNOTATION,
            specific_task_result=SentenceAnnotationLLMJobResult(
                llm_job_type=TaskType.SENTENCE_ANNOTATION, results=results
            ),
        )
