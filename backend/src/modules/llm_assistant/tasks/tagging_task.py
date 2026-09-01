from loguru import logger
from sqlalchemy.orm import Session

from core.doc.source_document_crud import crud_sdoc
from modules.llm_assistant.llm_job_dto import (
    FewShotParams,
    LLMJobOutput,
    TaggingLLMJobResult,
    TaggingParams,
    TaggingResult,
    TaskType,
    ZeroShotParams,
)
from modules.llm_assistant.strategies.tagging_strategy import (
    LLMTaggingResult,
    TaggingStrategy,
)
from modules.llm_assistant.tasks.llm_task import (
    BATCH_SIZE,
    BatchProcessingError,
    LLMTask,
)
from systems.job_system.job_dto import Job


class TaggingTask(LLMTask[TaggingStrategy, TaggingParams]):
    def execute(
        self,
        *,
        db: Session,
        job: Job,
        project_id: int,
        approach_parameters: ZeroShotParams | FewShotParams,
        task_parameters: TaggingParams,
        strategy: TaggingStrategy,
    ) -> LLMJobOutput:
        msg = f"Started LLMJob - Document Tagging, num docs: {len(task_parameters.sdoc_ids)}"
        self._update_llm_job_description(job=job, description=msg)
        logger.info(msg)

        # read sdocs
        sdoc_datas = self._read_sdoc_datas(db, task_parameters.sdoc_ids)

        # automatic document tagging
        result: list[TaggingResult] = []
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
                response_model=LLMTaggingResult,
            )

            # parse the responses, preparing the suggested annotation creation
            for response, sdoc_id in zip(responses, response_sdoc_ids):
                sdoc_data = sid2sdata.get(sdoc_id, None)
                assert sdoc_data is not None

                if response.is_error or response.parsed is None:
                    raise BatchProcessingError(
                        response.error or "Unknown LLM error",
                        raw_response=response.raw,
                    )

                # parse the response
                parsed_result = strategy.parse_result(result=response.parsed)

                # get current tag ids
                current_tag_ids = [
                    tag.id for tag in crud_sdoc.read(db=db, id=sdoc_data.id).tags
                ]

                result.append(
                    TaggingResult(
                        status="finished",
                        status_message="Document tagging successful",
                        sdoc_id=sdoc_data.id,
                        suggested_tag_ids=parsed_result.tag_ids,
                        current_tag_ids=current_tag_ids,
                        reasoning=parsed_result.reasoning,
                    )
                )

        return LLMJobOutput(
            llm_job_type=TaskType.TAGGING,
            specific_task_result=TaggingLLMJobResult(
                llm_job_type=TaskType.TAGGING, results=result
            ),
        )
