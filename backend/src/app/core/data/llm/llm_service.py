from datetime import datetime
from typing import Callable, Dict, List, Type, Union

from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.crud.user import SYSTEM_USER_ID
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.code import CodeRead
from app.core.data.dto.llm_job import (
    AnnotationLLMJobResult,
    AnnotationResult,
    DocumentTaggingLLMJobResult,
    DocumentTaggingResult,
    LLMJobCreate,
    LLMJobParameters,
    LLMJobRead,
    LLMJobResult,
    LLMJobType,
    LLMJobUpdate,
    LLMPromptTemplates,
    MetadataExtractionLLMJobResult,
    MetadataExtractionResult,
)
from app.core.data.dto.source_document_metadata import (
    SourceDocumentMetadataReadResolved,
)
from app.core.data.dto.span_annotation import SpanAnnotationReadResolved
from app.core.data.llm.ollama_service import OllamaService
from app.core.data.llm.prompts.annotation_prompt_builder import AnnotationPromptBuilder
from app.core.data.llm.prompts.metadata_prompt_builder import MetadataPromptBuilder
from app.core.data.llm.prompts.prompt_builder import PromptBuilder
from app.core.data.llm.prompts.tagging_prompt_builder import TaggingPromptBuilder
from app.core.data.repo.repo_service import RepoService
from app.core.db.redis_service import RedisService
from app.core.db.sql_service import SQLService
from app.util.singleton_meta import SingletonMeta


class LLMJobPreparationError(Exception):
    def __init__(self, cause: Union[Exception, str]) -> None:
        super().__init__(f"Cannot prepare and create the LLMJob! {cause}")


class LLMJobAlreadyStartedOrDoneError(Exception):
    def __init__(self, llm_job_id: str) -> None:
        super().__init__(f"The LLMJob with ID {llm_job_id} already started or is done!")


class NoSuchLLMJobError(Exception):
    def __init__(self, llm_job_id: str, cause: Exception) -> None:
        super().__init__(f"There exists not LLMJob with ID {llm_job_id}! {cause}")


class UnsupportedLLMJobTypeError(Exception):
    def __init__(self, llm_job_type: LLMJobType) -> None:
        super().__init__(f"LLMJobType {llm_job_type} is not supported! ")


class LLMService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.repo: RepoService = RepoService()
        cls.redis: RedisService = RedisService()
        cls.sqls: SQLService = SQLService()
        cls.ollamas: OllamaService = OllamaService()

        # map from job_type to function
        cls.llm_method_for_job_type: Dict[LLMJobType, Callable[..., LLMJobResult]] = {
            LLMJobType.DOCUMENT_TAGGING: cls._llm_document_tagging,
            LLMJobType.METADATA_EXTRACTION: cls._llm_metadata_extraction,
            LLMJobType.ANNOTATION: cls._llm_annotation,
        }

        # map from job_type to promt builder
        cls.llm_prompt_builder_for_job_type: Dict[LLMJobType, Type[PromptBuilder]] = {
            LLMJobType.DOCUMENT_TAGGING: TaggingPromptBuilder,
            LLMJobType.METADATA_EXTRACTION: MetadataPromptBuilder,
            LLMJobType.ANNOTATION: AnnotationPromptBuilder,
        }

        return super(LLMService, cls).__new__(cls)

    def _assert_all_requested_data_exists(self, llm_params: LLMJobParameters) -> bool:
        # TODO check all job type specific parameters
        return True

    def prepare_llm_job(self, llm_params: LLMJobParameters) -> LLMJobRead:
        if not self._assert_all_requested_data_exists(llm_params=llm_params):
            raise LLMJobPreparationError(
                cause="Not all requested data for the LLM job exists!"
            )

        llmj_create = LLMJobCreate(
            parameters=llm_params,
            num_steps_total=len(llm_params.specific_llm_job_parameters.sdoc_ids),
            num_steps_finished=0,
        )
        try:
            llmj_read = self.redis.store_llm_job(llm_job=llmj_create)
        except Exception as e:
            raise LLMJobPreparationError(cause=e)

        return llmj_read

    def get_llm_job(self, llm_job_id: str) -> LLMJobRead:
        try:
            llmj = self.redis.load_llm_job(key=llm_job_id)
        except Exception as e:
            raise NoSuchLLMJobError(llm_job_id=llm_job_id, cause=e)

        return llmj

    def get_all_llm_jobs(self, project_id: int) -> List[LLMJobRead]:
        return self.redis.get_all_llm_jobs(project_id=project_id)

    def _update_llm_job(self, llm_job_id: str, update: LLMJobUpdate) -> LLMJobRead:
        try:
            llmj = self.redis.update_llm_job(key=llm_job_id, update=update)
        except Exception as e:
            raise NoSuchLLMJobError(llm_job_id=llm_job_id, cause=e)
        return llmj

    def start_llm_job_sync(self, llm_job_id: str) -> LLMJobRead:
        llmj = self.get_llm_job(llm_job_id=llm_job_id)
        if llmj.status != BackgroundJobStatus.WAITING:
            raise LLMJobAlreadyStartedOrDoneError(llm_job_id=llm_job_id)

        llmj = self._update_llm_job(
            llm_job_id=llm_job_id,
            update=LLMJobUpdate(status=BackgroundJobStatus.RUNNING),
        )

        try:
            with self.sqls.db_session() as db:
                # get the llm method based on the jobtype
                llm_method = self.llm_method_for_job_type.get(
                    llmj.parameters.llm_job_type, None
                )
                if llm_method is None:
                    raise UnsupportedLLMJobTypeError(llmj.parameters.llm_job_type)

                # execute the llm_method with the provided specific parameters
                result = llm_method(
                    self=self,
                    db=db,
                    llm_job_id=llm_job_id,
                    prompts=llmj.parameters.prompts,
                    project_id=llmj.parameters.project_id,
                    **llmj.parameters.specific_llm_job_parameters.model_dump(
                        exclude={"llm_job_type"}
                    ),
                )

            llmj = self._update_llm_job(
                llm_job_id=llm_job_id,
                update=LLMJobUpdate(result=result, status=BackgroundJobStatus.FINISHED),
            )

        except Exception as e:
            logger.error(f"Cannot finish LLMJob: {e}")
            self._update_llm_job(
                llm_job_id=llm_job_id,
                update=LLMJobUpdate(status=BackgroundJobStatus.ERROR),
            )

        return llmj

    def create_prompt_templates(
        self, llm_job_params: LLMJobParameters
    ) -> List[LLMPromptTemplates]:
        with self.sqls.db_session() as db:
            # get the llm method based on the jobtype
            llm_prompt_builder = self.llm_prompt_builder_for_job_type.get(
                llm_job_params.llm_job_type, None
            )
            if llm_prompt_builder is None:
                raise UnsupportedLLMJobTypeError(llm_job_params.llm_job_type)

            # execute the the prompt builder with the provided specific parameters
            prompt_builder = llm_prompt_builder(
                db=db, project_id=llm_job_params.project_id
            )
            return prompt_builder.build_prompt_templates(
                **llm_job_params.specific_llm_job_parameters.model_dump(
                    exclude={"llm_job_type"}
                )
            )

    def construct_prompt_dict(
        self, prompts: List[LLMPromptTemplates], prompt_builder: PromptBuilder
    ) -> Dict[str, Dict[str, str]]:
        prompt_dict = {}
        for prompt in prompts:
            # validate prompts
            if not prompt_builder.is_system_prompt_valid(
                system_prompt=prompt.system_prompt
            ):
                raise ValueError("system prompt is not valid!")
            if not prompt_builder.is_user_prompt_valid(user_prompt=prompt.user_prompt):
                raise ValueError("User prompt is not valid!")

            prompt_dict[prompt.language] = {
                "system_prompt": prompt.system_prompt,
                "user_prompt": prompt.user_prompt,
            }
        return prompt_dict

    def _llm_document_tagging(
        self,
        db: Session,
        llm_job_id: str,
        prompts: List[LLMPromptTemplates],
        project_id: int,
        sdoc_ids: List[int],
        tag_ids: List[int],
    ) -> LLMJobResult:
        logger.info(f"Starting LLMJob - Document Tagging, num docs: {len(sdoc_ids)}")

        prompt_builder = TaggingPromptBuilder(db=db, project_id=project_id)

        # build prompt dict (to validate and access prompts by language and system / user)
        prompt_dict = self.construct_prompt_dict(
            prompts=prompts, prompt_builder=prompt_builder
        )

        # read sdocs
        sdoc_datas = crud_sdoc.read_data_batch(db=db, ids=sdoc_ids)

        # automatic document tagging
        result: List[DocumentTaggingResult] = []
        for idx, (sdoc_id, sdoc_data) in enumerate(zip(sdoc_ids, sdoc_datas)):
            if sdoc_data is None:
                raise ValueError(
                    f"Could not find SourceDocumentDataORM for sdoc_id {sdoc_id}!"
                )

            # get current tag ids
            current_tag_ids = [
                tag.id for tag in crud_sdoc.read(db=db, id=sdoc_data.id).document_tags
            ]

            # get language
            language = crud_sdoc_meta.read_by_sdoc_and_key(
                db=db, sdoc_id=sdoc_data.id, key="language"
            ).str_value
            logger.info(f"Processing SDOC id={sdoc_data.id}, lang={language}")
            if language is None or language not in prompt_builder.supported_languages:
                result.append(
                    DocumentTaggingResult(
                        sdoc_id=sdoc_data.id,
                        suggested_tag_ids=[],
                        current_tag_ids=current_tag_ids,
                        reasoning="Language not supported",
                    )
                )
                self._update_llm_job(
                    llm_job_id=llm_job_id,
                    update=LLMJobUpdate(num_steps_finished=idx + 1),
                )
                continue

            # construct prompts
            system_prompt = prompt_builder.build_system_prompt(
                system_prompt_template=prompt_dict[language]["system_prompt"]
            )
            user_prompt = prompt_builder.build_user_prompt(
                user_prompt_template=prompt_dict[language]["user_prompt"],
                document=sdoc_data.content,
            )

            # prompt the model
            response = self.ollamas.chat(
                system_prompt=system_prompt, user_prompt=user_prompt
            )
            logger.info(f"Got chat response! Response={response}")

            # parse the response
            tag_ids, reason = prompt_builder.parse_response(
                language=language, response=response
            )
            logger.info(f"Parsed the response! Tag IDs={tag_ids}, Reason={reason}")

            result.append(
                DocumentTaggingResult(
                    sdoc_id=sdoc_data.id,
                    suggested_tag_ids=tag_ids,
                    current_tag_ids=current_tag_ids,
                    reasoning=reason,
                )
            )
            self._update_llm_job(
                llm_job_id=llm_job_id,
                update=LLMJobUpdate(num_steps_finished=idx + 1),
            )

        return LLMJobResult(
            llm_job_type=LLMJobType.DOCUMENT_TAGGING,
            specific_llm_job_result=DocumentTaggingLLMJobResult(
                llm_job_type=LLMJobType.DOCUMENT_TAGGING, results=result
            ),
        )

    def _llm_metadata_extraction(
        self,
        db: Session,
        llm_job_id: str,
        prompts: List[LLMPromptTemplates],
        project_id: int,
        sdoc_ids: List[int],
        project_metadata_ids: List[int],
    ) -> LLMJobResult:
        logger.info(f"Starting LLMJob - Metadata Extraction, num docs: {len(sdoc_ids)}")

        prompt_builder = MetadataPromptBuilder(db=db, project_id=project_id)

        # build prompt dict (to validate and access prompts by language and system / user)
        prompt_dict = self.construct_prompt_dict(
            prompts=prompts, prompt_builder=prompt_builder
        )

        # read sdocs
        sdoc_datas = crud_sdoc.read_data_batch(db=db, ids=sdoc_ids)
        # automatic metadata extraction
        result: List[MetadataExtractionResult] = []
        for idx, (sdoc_id, sdoc_data) in enumerate(zip(sdoc_ids, sdoc_datas)):
            if sdoc_data is None:
                raise ValueError(
                    f"Could not find SourceDocumentDataORM for sdoc_id {sdoc_id}!"
                )

            # get current metadata values
            current_metadata = [
                SourceDocumentMetadataReadResolved.model_validate(metadata)
                for metadata in crud_sdoc.read(db=db, id=sdoc_data.id).metadata_
                if metadata.project_metadata_id in project_metadata_ids
            ]
            current_metadata_dict = {
                metadata.project_metadata.id: metadata for metadata in current_metadata
            }

            # get language
            language = crud_sdoc_meta.read_by_sdoc_and_key(
                db=db, sdoc_id=sdoc_data.id, key="language"
            ).str_value
            logger.info(f"Processing SDOC id={sdoc_data.id}, lang={language}")
            if language is None or language not in prompt_builder.supported_languages:
                result.append(
                    MetadataExtractionResult(
                        sdoc_id=sdoc_data.id,
                        current_metadata=current_metadata,
                        suggested_metadata=[],
                    )
                )
                self._update_llm_job(
                    llm_job_id=llm_job_id,
                    update=LLMJobUpdate(num_steps_finished=idx + 1),
                )
                continue

            # construct prompts
            system_prompt = prompt_builder.build_system_prompt(
                system_prompt_template=prompt_dict[language]["system_prompt"]
            )
            user_prompt = prompt_builder.build_user_prompt(
                user_prompt_template=prompt_dict[language]["user_prompt"],
                document=sdoc_data.content,
            )

            # prompt the model
            response = self.ollamas.chat(
                system_prompt=system_prompt, user_prompt=user_prompt
            )
            logger.info(f"Got chat response! Response={response}")

            # parse the response
            parsed_response = prompt_builder.parse_response(
                language=language, response=response
            )

            # create correct suggested metadata (map the parsed response to the current metadata)
            suggested_metadata = []
            for project_metadata_id in project_metadata_ids:
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
            logger.info(f"Parsed the response! suggested metadata={suggested_metadata}")

            result.append(
                MetadataExtractionResult(
                    sdoc_id=sdoc_data.id,
                    current_metadata=current_metadata,
                    suggested_metadata=suggested_metadata,
                )
            )
            self._update_llm_job(
                llm_job_id=llm_job_id,
                update=LLMJobUpdate(num_steps_finished=idx + 1),
            )

        return LLMJobResult(
            llm_job_type=LLMJobType.METADATA_EXTRACTION,
            specific_llm_job_result=MetadataExtractionLLMJobResult(
                llm_job_type=LLMJobType.METADATA_EXTRACTION, results=result
            ),
        )

    def _llm_annotation(
        self,
        db: Session,
        llm_job_id: str,
        prompts: List[LLMPromptTemplates],
        project_id: int,
        sdoc_ids: List[int],
        code_ids: List[int],
    ) -> LLMJobResult:
        logger.info(f"Starting LLMJob - Annotation, num docs: {len(sdoc_ids)}")

        prompt_builder = AnnotationPromptBuilder(db=db, project_id=project_id)
        project_codes = prompt_builder.codeids2code_dict

        # build prompt dict (to validate and access prompts by language and system / user)
        prompt_dict = self.construct_prompt_dict(
            prompts=prompts, prompt_builder=prompt_builder
        )

        # read sdocs
        sdoc_datas = crud_sdoc.read_data_batch(db=db, ids=sdoc_ids)

        # automatic annotation
        annotation_id = 0
        result: List[AnnotationResult] = []
        for idx, (sdoc_id, sdoc_data) in enumerate(zip(sdoc_ids, sdoc_datas)):
            if sdoc_data is None:
                raise ValueError(
                    f"Could not find SourceDocumentDataORM for sdoc_id {sdoc_id}!"
                )

            # get language
            language = crud_sdoc_meta.read_by_sdoc_and_key(
                db=db, sdoc_id=sdoc_data.id, key="language"
            ).str_value
            logger.info(f"Processing SDOC id={sdoc_data.id}, lang={language}")
            if language is None or language not in prompt_builder.supported_languages:
                result.append(
                    AnnotationResult(sdoc_id=sdoc_data.id, suggested_annotations=[])
                )
                self._update_llm_job(
                    llm_job_id=llm_job_id,
                    update=LLMJobUpdate(num_steps_finished=idx + 1),
                )
                continue

            # construct prompts
            system_prompt = prompt_builder.build_system_prompt(
                system_prompt_template=prompt_dict[language]["system_prompt"]
            )
            user_prompt = prompt_builder.build_user_prompt(
                user_prompt_template=prompt_dict[language]["user_prompt"],
                document=sdoc_data.content,
            )

            # prompt the model
            response = self.ollamas.chat(
                system_prompt=system_prompt, user_prompt=user_prompt
            )
            logger.info(f"Got chat response! Response={response}")

            # parse the response
            parsed_response = prompt_builder.parse_response(
                language=language, response=response
            )

            # validate the response and create the suggested annotation
            suggested_annotations: List[SpanAnnotationReadResolved] = []
            for code_id, span_text in parsed_response:
                # check if the code_id is valid
                if code_id not in project_codes:
                    continue

                document_text = sdoc_data.content.lower()
                annotation_text = span_text.lower()

                # find start and end character of the annotation_text in the document_text
                start = document_text.find(annotation_text)
                end = start + len(annotation_text)
                if start == -1:
                    continue

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
                    SpanAnnotationReadResolved(
                        id=annotation_id,
                        sdoc_id=sdoc_data.id,
                        user_id=SYSTEM_USER_ID,
                        begin=start,
                        end=end,
                        begin_token=begin_token,
                        end_token=end_token,
                        text=span_text,
                        code=CodeRead.model_validate(project_codes.get(code_id)),
                        created=datetime.now(),
                        updated=datetime.now(),
                    )
                )
                annotation_id += 1
            logger.info(
                f"Parsed the response! suggested annotations={suggested_annotations}"
            )

            result.append(
                AnnotationResult(
                    sdoc_id=sdoc_data.id,
                    suggested_annotations=suggested_annotations,
                )
            )
            self._update_llm_job(
                llm_job_id=llm_job_id,
                update=LLMJobUpdate(num_steps_finished=idx + 1),
            )

        return LLMJobResult(
            llm_job_type=LLMJobType.ANNOTATION,
            specific_llm_job_result=AnnotationLLMJobResult(
                llm_job_type=LLMJobType.ANNOTATION, results=result
            ),
        )
