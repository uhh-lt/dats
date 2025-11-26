from datetime import datetime
from typing import Callable, Type, TypeVar

from loguru import logger
from pydantic import BaseModel
from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from config import conf
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.sentence_annotation_dto import (
    SentenceAnnotationCreate,
    SentenceAnnotationRead,
)
from core.annotation.span_annotation_dto import SpanAnnotationRead
from core.code.code_crud import crud_code
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.metadata.source_document_metadata_dto import (
    SourceDocumentMetadataReadResolved,
)
from core.user.user_crud import (
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_ZEROSHOT_ID,
    SYSTEM_USER_IDS,
)
from modules.llm_assistant.llm_exceptions import UnsupportedLLMJobTypeError
from modules.llm_assistant.llm_job_dto import (
    AnnotationLLMJobResult,
    AnnotationParams,
    AnnotationResult,
    ApproachRecommendation,
    ApproachType,
    FewShotParams,
    LLMJobInput,
    LLMJobOutput,
    LLMJobParameters,
    LLMPromptTemplates,
    MetadataExtractionLLMJobResult,
    MetadataExtractionParams,
    MetadataExtractionResult,
    SentenceAnnotationLLMJobResult,
    SentenceAnnotationParams,
    SentenceAnnotationResult,
    TaggingLLMJobResult,
    TaggingParams,
    TaggingResult,
    TaskType,
    ZeroShotParams,
)
from modules.llm_assistant.prompts.annotation_prompt_builder import (
    AnnotationPromptBuilder,
    LLMAnnotationResults,
)
from modules.llm_assistant.prompts.metadata_prompt_builder import (
    LLMMetadataExtractionResults,
    MetadataPromptBuilder,
)
from modules.llm_assistant.prompts.prompt_builder import DataTag, PromptBuilder
from modules.llm_assistant.prompts.sentence_annotation_prompt_builder import (
    LLMSentenceAnnotationResults,
    SentenceAnnotationPromptBuilder,
)
from modules.llm_assistant.prompts.tagging_prompt_builder import (
    LLMTaggingResult,
    TaggingPromptBuilder,
)
from repos.llm_repo import LLMMessage, LLMRepo
from repos.ray.ray_repo import RayRepo
from repos.vector.weaviate_repo import WeaviateRepo
from systems.job_system.job_dto import Job

lac = conf.llm_assistant
BATCH_SIZE = 32

T = TypeVar("T", bound=BaseModel)


class LLMAssistantService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.llm: LLMRepo = LLMRepo()
        cls.ray: RayRepo = RayRepo()
        cls.weaviate: WeaviateRepo = WeaviateRepo()

        # map from job_type to function
        cls.llm_method_for_job_approach_type: dict[
            TaskType, dict[ApproachType, Callable[..., LLMJobOutput]]
        ] = {
            TaskType.TAGGING: {
                ApproachType.LLM_ZERO_SHOT: cls._llm_tagging,
                ApproachType.LLM_FEW_SHOT: cls._llm_tagging,
            },
            TaskType.METADATA_EXTRACTION: {
                ApproachType.LLM_ZERO_SHOT: cls._llm_metadata_extraction,
                ApproachType.LLM_FEW_SHOT: cls._llm_metadata_extraction,
            },
            TaskType.ANNOTATION: {
                ApproachType.LLM_ZERO_SHOT: cls._llm_annotation,
                ApproachType.LLM_FEW_SHOT: cls._llm_annotation,
            },
            TaskType.SENTENCE_ANNOTATION: {
                ApproachType.LLM_ZERO_SHOT: cls._llm_sentence_annotation,
                ApproachType.LLM_FEW_SHOT: cls._llm_sentence_annotation,
            },
        }

        # map from job_type to promt builder
        cls.llm_prompt_builder_for_job_type: dict[TaskType, Type[PromptBuilder]] = {
            TaskType.TAGGING: TaggingPromptBuilder,
            TaskType.METADATA_EXTRACTION: MetadataPromptBuilder,
            TaskType.ANNOTATION: AnnotationPromptBuilder,
            TaskType.SENTENCE_ANNOTATION: SentenceAnnotationPromptBuilder,
        }

        return super(LLMAssistantService, cls).__new__(cls)

    def _next_llm_job_step(self, job: Job, description: str) -> None:
        job.update(current_step=job.get_current_step() + 1, status_message=description)

    def _update_llm_job_description(self, job: Job, description: str) -> None:
        job.update(status_message=description)

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

        # get the llm method based on the jobtype
        llm_method = self.llm_method_for_job_approach_type[payload.llm_job_type][
            payload.llm_approach_type
        ]
        if llm_method is None:
            raise UnsupportedLLMJobTypeError(payload.llm_job_type)

        # execute the llm_method with the provided specific parameters
        result = llm_method(
            self=self,
            db=db,
            job=job,
            project_id=payload.project_id,
            approach_parameters=payload.specific_approach_parameters,
            task_parameters=payload.specific_task_parameters,
        )

        job.update(
            current_step=len(job.get_steps()) - 1,
            status_message="Finished LLMJob successfully!",
        )

        return result

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
                return ApproachRecommendation(
                    recommended_approach=ApproachType.LLM_ZERO_SHOT,
                    available_approaches={
                        ApproachType.LLM_ZERO_SHOT: True,
                        ApproachType.LLM_FEW_SHOT: False,
                    },
                    reasoning="Only zero-shot approach is available for annotation (yet).",
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
                    >= lac.sentence_annotation.few_shot_threshold,
                }

                # 4.4 determine the recommended approach based on thresholds
                if min_labeled_sentences < lac.sentence_annotation.few_shot_threshold:
                    recommended_approach = ApproachType.LLM_ZERO_SHOT
                else:
                    recommended_approach = ApproachType.LLM_FEW_SHOT

                return ApproachRecommendation(
                    recommended_approach=recommended_approach,
                    available_approaches=available_approaches,
                    reasoning=reasoning,
                )

    def count_existing_assistant_annotations(
        self,
        db: Session,
        task_type: TaskType,
        code_ids: list[int],
        sdoc_ids: list[int],
        approach_type: ApproachType,
    ) -> dict[int, int]:
        match task_type:
            case TaskType.SENTENCE_ANNOTATION:
                # 1. Find existing annotations
                approachtype2userid = {
                    ApproachType.LLM_ZERO_SHOT: ASSISTANT_ZEROSHOT_ID,
                    ApproachType.LLM_FEW_SHOT: ASSISTANT_FEWSHOT_ID,
                }
                existing_annotations = crud_sentence_anno.read_by_user_sdocs_codes(
                    db=db,
                    user_id=approachtype2userid[approach_type],
                    sdoc_ids=sdoc_ids,
                    code_ids=code_ids,
                )

                # 2. Count the number of existing annotations per code
                code_id2num_existing_annos = {code_id: 0 for code_id in code_ids}
                for existing_anno in existing_annotations:
                    code_id2num_existing_annos[existing_anno.code_id] += 1

                return code_id2num_existing_annos
            case _:
                return {}

    def create_prompt_templates(
        self,
        db: Session,
        llm_job_params: LLMJobParameters,
        approach_type: ApproachType,
        example_ids: list[int] | None = None,
    ) -> list[LLMPromptTemplates]:
        # get the llm method based on the jobtype
        llm_prompt_builder = self.llm_prompt_builder_for_job_type.get(
            llm_job_params.llm_job_type, None
        )
        if llm_prompt_builder is None:
            raise UnsupportedLLMJobTypeError(llm_job_params.llm_job_type)

        # init the prompt builder with the provided specific parameters
        # the init process will generate prompt templates
        prompt_builder = llm_prompt_builder(
            db=db,
            project_id=llm_job_params.project_id,
            is_fewshot=approach_type == ApproachType.LLM_FEW_SHOT,
            params=llm_job_params.specific_task_parameters,
            example_ids=example_ids,
        )
        return list(prompt_builder.lang2prompt_templates.values())

    def __process_batch(
        self,
        prompt_builder: PromptBuilder,
        db: Session,
        sdoc_ids: list[int],
        sdoc_datas: list[SourceDocumentDataORM],
        response_model: Type[T],
    ) -> tuple[list[T], list[int], list[int]]:
        # prepare batch messages
        batch_messages: list[LLMMessage] = []
        bm_sids: list[int] = []  # sdoc_id corresponding to each batch_message
        bm_ids: list[int] = []  # message id corresponding to each batch_message
        for idx, (sdoc_id, sdoc_data) in enumerate(zip(sdoc_ids, sdoc_datas)):
            # get language
            language = crud_sdoc_meta.read_by_sdoc_and_key(
                db=db, sdoc_id=sdoc_data.id, key="language"
            ).str_value
            if language is None:
                raise ValueError(f"Document with ID {sdoc_id} has no language!")

            # construct prompts
            prompts = prompt_builder.build_prompt(
                language=language,
                sdoc_data=sdoc_data,
            )
            batch_messages.extend(prompts)
            bm_sids.extend([sdoc_id] * len(prompts))
            bm_ids.extend(list(range(len(prompts))))

        # prompt the model (batchwise)
        responses = self.llm.llm_batch_chat(
            messages=batch_messages,
            response_model=response_model,
        )

        return responses, bm_sids, bm_ids

    def _llm_tagging(
        self,
        *,
        db: Session,
        job: Job,
        project_id: int,
        approach_parameters: ZeroShotParams,
        task_parameters: TaggingParams,
    ) -> LLMJobOutput:
        assert isinstance(task_parameters, TaggingParams), "Wrong task parameters!"
        assert isinstance(approach_parameters, ZeroShotParams), (
            "Wrong approach parameters!"
        )

        msg = f"Started LLMJob - Document Tagging, num docs: {len(task_parameters.sdoc_ids)}"
        self._update_llm_job_description(
            job=job,
            description=msg,
        )
        logger.info(msg)

        prompt_builder = TaggingPromptBuilder(
            db=db,
            project_id=project_id,
            is_fewshot=isinstance(approach_parameters, FewShotParams),
            prompt_templates=approach_parameters.prompts,
        )

        # read sdocs
        sdoc_datas = crud_sdoc_data.read_by_ids(db=db, ids=task_parameters.sdoc_ids)

        # automatic document tagging
        result: list[TaggingResult] = []
        num_batches = (len(task_parameters.sdoc_ids) + BATCH_SIZE - 1) // BATCH_SIZE
        for i in range(0, len(task_parameters.sdoc_ids), BATCH_SIZE):
            # update job status
            msg = f"Processing batch {i // BATCH_SIZE + 1} of {num_batches}"
            self._next_llm_job_step(
                job=job,
                description=msg,
            )
            logger.info(msg)

            # batch data
            sids = task_parameters.sdoc_ids[i : i + BATCH_SIZE]
            sdata = sdoc_datas[i : i + BATCH_SIZE]
            sid2sdata = {
                sdoc_data.id: sdoc_data for sdoc_data in sdata if sdoc_data is not None
            }

            # process the batch with LLM
            responses, response_sdoc_ids, _ = self.__process_batch(
                prompt_builder=prompt_builder,
                db=db,
                sdoc_ids=sids,
                sdoc_datas=sdata,
                response_model=LLMTaggingResult,
            )

            # parse the responses, preparing the suggested annotation creation
            for response, sdoc_id in zip(responses, response_sdoc_ids):
                sdoc_data = sid2sdata.get(sdoc_id, None)
                assert sdoc_data is not None

                # parse the response
                parsed_result = prompt_builder.parse_result(result=response)

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

    def _llm_metadata_extraction(
        self,
        *,
        db: Session,
        job: Job,
        project_id: int,
        approach_parameters: ZeroShotParams,
        task_parameters: MetadataExtractionParams,
    ) -> LLMJobOutput:
        assert isinstance(task_parameters, MetadataExtractionParams), (
            "Wrong task parameters!"
        )
        assert isinstance(approach_parameters, ZeroShotParams), (
            "Wrong approach parameters!"
        )

        msg = f"Started LLMJob - Metadata Extraction, num docs: {len(task_parameters.sdoc_ids)}"
        self._update_llm_job_description(
            job=job,
            description=msg,
        )
        logger.info(msg)

        prompt_builder = MetadataPromptBuilder(
            db=db,
            project_id=project_id,
            is_fewshot=isinstance(approach_parameters, FewShotParams),
            prompt_templates=approach_parameters.prompts,
        )

        # read sdocs
        sdoc_datas = crud_sdoc_data.read_by_ids(db=db, ids=task_parameters.sdoc_ids)

        # automatic metadata extraction
        result: list[MetadataExtractionResult] = []
        num_batches = (len(task_parameters.sdoc_ids) + BATCH_SIZE - 1) // BATCH_SIZE
        for i in range(0, len(task_parameters.sdoc_ids), BATCH_SIZE):
            # update job status
            msg = f"Processing batch {i // BATCH_SIZE + 1} of {num_batches}"
            self._next_llm_job_step(
                job=job,
                description=msg,
            )
            logger.info(msg)

            # batch data
            sids = task_parameters.sdoc_ids[i : i + BATCH_SIZE]
            sdata = sdoc_datas[i : i + BATCH_SIZE]
            sid2sdata = {
                sdoc_data.id: sdoc_data for sdoc_data in sdata if sdoc_data is not None
            }

            # process the batch with LLM
            responses, response_sdoc_ids, _ = self.__process_batch(
                prompt_builder=prompt_builder,
                db=db,
                sdoc_ids=sids,
                sdoc_datas=sdata,
                response_model=LLMMetadataExtractionResults,
            )

            # transform the response
            for response, sdoc_id in zip(responses, response_sdoc_ids):
                sdoc_data = sid2sdata.get(sdoc_id, None)
                assert sdoc_data is not None

                suggested_metadata: list[SourceDocumentMetadataReadResolved] = []

                # parse the response
                parsed_response = prompt_builder.parse_result(result=response)

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

    def _llm_annotation(
        self,
        *,
        db: Session,
        job: Job,
        project_id: int,
        approach_parameters: ZeroShotParams,
        task_parameters: AnnotationParams,
    ) -> LLMJobOutput:
        assert isinstance(task_parameters, AnnotationParams), "Wrong task parameters!"
        assert isinstance(approach_parameters, ZeroShotParams), (
            "Wrong approach parameters!"
        )

        msg = f"Started LLMJob - Annotation, num docs: {len(task_parameters.sdoc_ids)}"
        self._update_llm_job_description(
            job=job,
            description=msg,
        )
        logger.info(msg)

        prompt_builder = AnnotationPromptBuilder(
            db=db,
            project_id=project_id,
            is_fewshot=isinstance(approach_parameters, FewShotParams),
            prompt_templates=approach_parameters.prompts,
        )
        project_codes = prompt_builder.codeids2code_dict

        # read sdocs
        sdoc_datas = crud_sdoc_data.read_by_ids(db=db, ids=task_parameters.sdoc_ids)

        # automatic annotation
        annotation_id = 0
        result: list[AnnotationResult] = []
        num_batches = (len(task_parameters.sdoc_ids) + BATCH_SIZE - 1) // BATCH_SIZE
        for i in range(0, len(task_parameters.sdoc_ids), BATCH_SIZE):
            # update job status
            msg = f"Processing batch {i // BATCH_SIZE + 1} of {num_batches}"
            self._next_llm_job_step(
                job=job,
                description=msg,
            )
            logger.info(msg)

            # batch data
            sids = task_parameters.sdoc_ids[i : i + BATCH_SIZE]
            sdata = sdoc_datas[i : i + BATCH_SIZE]
            sid2sdata = {
                sdoc_data.id: sdoc_data for sdoc_data in sdata if sdoc_data is not None
            }

            # process the batch with LLM
            responses, response_sdoc_ids, response_sentence_ids = self.__process_batch(
                prompt_builder=prompt_builder,
                db=db,
                sdoc_ids=sids,
                sdoc_datas=sdata,
                response_model=LLMAnnotationResults,
            )

            # parse the responses, preparing the suggested annotation creation
            suggested_annotations: list[SpanAnnotationRead] = []
            for response, sdoc_id, sentence_id in zip(
                responses, response_sdoc_ids, response_sentence_ids
            ):
                sdoc_data = sid2sdata.get(sdoc_id, None)
                assert sdoc_data is not None

                match prompt_builder.data_tag:
                    case DataTag.SENTENCE:
                        # the prompt was constructed per sentence, so we only annotate within this sentence only
                        content = sdoc_data.sentences[sentence_id]
                        start_offset = sdoc_data.sentence_starts[sentence_id]
                    case DataTag.DOCUMENT:
                        # the prompt was constructed on the entire document, so we can annotate anywhere in the document
                        content = sdoc_data.content
                        start_offset = 0
                    case _:
                        raise ValueError("Unknown DataTag!")  # type: ignore

                # parse the response
                parsed_response = prompt_builder.parse_result(result=response)

                # validate the response and create the suggested annotation
                for x in parsed_response:
                    code_id = x.code_id
                    span_text = x.text

                    # check if the code_id is valid
                    if code_id not in project_codes:
                        continue

                    document_text = content.lower()
                    annotation_text = span_text.lower()

                    # find start and end character of the annotation_text in the document_text
                    start = document_text.find(annotation_text)
                    if start == -1:
                        continue

                    start += start_offset  # adjust to document/sentence offset
                    end = start + len(annotation_text)

                    # find start and end token of the annotation_text in the document_tokens
                    # create a map of character offsets to token ids
                    document_token_map = {}  # character offset -> token id
                    last_character_offset = 0
                    for token_id, token_end in enumerate(sdoc_data.token_ends):
                        for i in range(last_character_offset, token_end):
                            document_token_map[i] = token_id
                        last_character_offset = token_end

                    begin_token = document_token_map.get(start, -1)
                    end_token = document_token_map.get(end, -1)
                    if begin_token == -1 or end_token == -1:
                        continue

                    # create the suggested annotation
                    suggested_annotations.append(
                        SpanAnnotationRead(
                            id=annotation_id,
                            sdoc_id=sdoc_data.id,
                            user_id=ASSISTANT_ZEROSHOT_ID,
                            begin=start,
                            end=end,
                            begin_token=begin_token,
                            end_token=end_token,
                            text=span_text,
                            code_id=code_id,
                            created=datetime.now(),
                            updated=datetime.now(),
                            group_ids=[],
                            memo_ids=[],
                        )
                    )
                    annotation_id += 1
            logger.info(
                f"Parsed the response! suggested annotations={suggested_annotations}"
            )

            # create results for this batch
            sdoc_id2created_annos: dict[int, list[SpanAnnotationRead]] = {}
            for anno in suggested_annotations:
                if anno.sdoc_id not in sdoc_id2created_annos:
                    sdoc_id2created_annos[anno.sdoc_id] = []
                sdoc_id2created_annos[anno.sdoc_id].append(anno)
            result.extend(
                [
                    AnnotationResult(
                        status="finished",
                        status_message="Annotation successful",
                        sdoc_id=sdoc_id,
                        suggested_annotations=created_annos,
                    )
                    for sdoc_id, created_annos in sdoc_id2created_annos.items()
                ]
            )

        return LLMJobOutput(
            llm_job_type=TaskType.ANNOTATION,
            specific_task_result=AnnotationLLMJobResult(
                llm_job_type=TaskType.ANNOTATION, results=result
            ),
        )

    def _llm_sentence_annotation(
        self,
        *,
        db: Session,
        job: Job,
        project_id: int,
        approach_parameters: ZeroShotParams | FewShotParams,
        task_parameters: SentenceAnnotationParams,
    ) -> LLMJobOutput:
        assert isinstance(task_parameters, SentenceAnnotationParams), (
            "Wrong task parameters!"
        )
        assert isinstance(approach_parameters, ZeroShotParams) or isinstance(
            approach_parameters, FewShotParams
        ), "Wrong approach parameters!"
        is_fewshot = isinstance(approach_parameters, FewShotParams)

        msg = f"Started LLMJob - Sentence Annotation (LLM), num docs: {len(task_parameters.sdoc_ids)}"
        self._update_llm_job_description(
            job=job,
            description=msg,
        )
        logger.info(msg)

        prompt_builder = SentenceAnnotationPromptBuilder(
            db=db,
            project_id=project_id,
            is_fewshot=is_fewshot,
            prompt_templates=approach_parameters.prompts,
        )
        project_codes = prompt_builder.codeids2code_dict

        # read sdocs
        sdoc_datas = crud_sdoc_data.read_by_ids(db=db, ids=task_parameters.sdoc_ids)

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
        num_batches = (len(task_parameters.sdoc_ids) + BATCH_SIZE - 1) // BATCH_SIZE
        for i in range(0, len(task_parameters.sdoc_ids), BATCH_SIZE):
            # update job status
            msg = f"Processing batch {i // BATCH_SIZE + 1} of {num_batches}"
            self._next_llm_job_step(
                job=job,
                description=msg,
            )
            logger.info(msg)

            # batch data
            sids = task_parameters.sdoc_ids[i : i + BATCH_SIZE]
            sdata = sdoc_datas[i : i + BATCH_SIZE]
            sid2sdata = {
                sdoc_data.id: sdoc_data for sdoc_data in sdata if sdoc_data is not None
            }

            # process the batch with LLM
            responses, response_sdoc_ids, response_sentence_ids = self.__process_batch(
                prompt_builder=prompt_builder,
                db=db,
                sdoc_ids=sids,
                sdoc_datas=sdata,
                response_model=LLMSentenceAnnotationResults,
            )

            # parse the responses, preparing the suggested annotation creation
            suggested_annotations: list[SentenceAnnotationCreate] = []
            for response, sdoc_id, sentence_id in zip(
                responses, response_sdoc_ids, response_sentence_ids
            ):
                sdoc_data = sid2sdata.get(sdoc_id, None)
                assert sdoc_data is not None
                num_sentences = len(sdoc_data.sentences)

                # parse the response
                parsed_response = prompt_builder.parse_result(result=response)
                match prompt_builder.data_tag:
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
            results.extend(
                [
                    SentenceAnnotationResult(
                        status="finished",
                        status_message="Sentence annotation successful",
                        sdoc_id=sdoc_id,
                        suggested_annotations=created_annos,
                    )
                    for sdoc_id, created_annos in sdoc_id2created_annos.items()
                ]
            )

        return LLMJobOutput(
            llm_job_type=TaskType.SENTENCE_ANNOTATION,
            specific_task_result=SentenceAnnotationLLMJobResult(
                llm_job_type=TaskType.SENTENCE_ANNOTATION, results=results
            ),
        )
