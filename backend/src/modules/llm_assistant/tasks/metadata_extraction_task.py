from loguru import logger
from sqlalchemy.orm import Session

from core.doc.source_document_crud import crud_sdoc
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataReadResolved,
)
from modules.llm_assistant.llm_job_dto import (
    ApproachRecommendation,
    ApproachType,
    FewShotParams,
    LLMJobOutput,
    MetadataExtractionLLMJobResult,
    MetadataExtractionParams,
    MetadataExtractionResult,
    SpecificTaskParameters,
    TaskType,
    ZeroShotParams,
)
from modules.llm_assistant.strategies.metadata_strategy import MetadataStrategy
from modules.llm_assistant.tasks.llm_task import (
    BATCH_SIZE,
    BatchProcessingError,
    LLMTask,
)
from systems.job_system.job_dto import Job


class MetadataExtractionTask(LLMTask[MetadataStrategy, MetadataExtractionParams]):
    @classmethod
    def determine_approach(
        cls, db: Session, task_parameters: SpecificTaskParameters
    ) -> ApproachRecommendation:
        return ApproachRecommendation(
            recommended_approach=ApproachType.LLM_ZERO_SHOT,
            available_approaches={
                ApproachType.LLM_ZERO_SHOT: True,
                ApproachType.LLM_FEW_SHOT: False,
            },
            reasoning="Only zero-shot approach is available for metadata extraction (yet).",
        )

    def execute(
        self,
        *,
        db: Session,
        job: Job,
        project_id: int,
        approach_parameters: ZeroShotParams | FewShotParams,
        task_parameters: MetadataExtractionParams,
        strategy: MetadataStrategy,
    ) -> LLMJobOutput:
        msg = f"Started LLMJob - Metadata Extraction, num docs: {len(task_parameters.sdoc_ids)}"
        self._update_llm_job_description(job=job, description=msg)
        logger.info(msg)

        # read sdocs
        sdoc_datas = self._read_sdoc_datas(db, task_parameters.sdoc_ids)

        # automatic metadata extraction
        result: list[MetadataExtractionResult] = []
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
            responses, response_sdoc_ids, _ = self._process_batch(
                model=approach_parameters.model,
                strategy=strategy,
                db=db,
                sdoc_ids=sids,
                sdoc_datas=sdata,
                response_model=strategy.get_response_model(),
            )

            # transform the response
            for response, sdoc_id in zip(responses, response_sdoc_ids):
                sdoc_data = sid2sdata.get(sdoc_id, None)
                assert sdoc_data is not None

                if response.is_error or response.parsed is None:
                    raise BatchProcessingError(
                        response.error or "Unknown LLM error",
                        raw_response=response.raw,
                    )

                suggested_metadata: list[SourceDocumentMetadataReadResolved] = []

                # parse the response
                parsed_response = strategy.parse_result(result=response.parsed)

                # get current metadata values
                current_metadata = [
                    SourceDocumentMetadataReadResolved.model_validate(metadata)
                    for metadata in crud_sdoc.read(db=db, id=sdoc_data.id).metadata_
                    if metadata.project_metadata_id
                    in task_parameters.project_metadata_ids
                ]
                current_metadata_dict = {
                    metadata.project_metadata.id: metadata
                    for metadata in current_metadata
                }

                # create correct suggested metadata (map the parsed response to the current metadata)
                for project_metadata_id in task_parameters.project_metadata_ids:
                    current = current_metadata_dict.get(project_metadata_id)
                    suggestion = parsed_response.get(project_metadata_id)
                    if current is None or suggestion is None:
                        continue

                    suggested_metadata.append(
                        SourceDocumentMetadataReadResolved.with_value(
                            sdoc_metadata_id=current.id,
                            source_document_id=current.source_document_id,
                            project_metadata=current.project_metadata,
                            value=suggestion,
                        )
                    )

                logger.info(
                    f"Parsed the response! suggested metadata={suggested_metadata}"
                )

                result.append(
                    MetadataExtractionResult(
                        status="finished",
                        status_message="Metadata extraction successful",
                        sdoc_id=sdoc_data.id,
                        current_metadata=current_metadata,
                        suggested_metadata=suggested_metadata,
                    )
                )

        return LLMJobOutput(
            llm_job_type=TaskType.METADATA_EXTRACTION,
            specific_task_result=MetadataExtractionLLMJobResult(
                llm_job_type=TaskType.METADATA_EXTRACTION, results=result
            ),
        )
