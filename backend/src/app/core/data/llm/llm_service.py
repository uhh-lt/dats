import re
from typing import Callable, Dict, List, Optional, Tuple, Union

from loguru import logger
from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.crud.source_document_metadata import crud_sdoc_meta
from app.core.data.dto.background_job_base import BackgroundJobStatus
from app.core.data.dto.llm_job import (
    AnnotationLLMJobResult,
    DocumentTaggingLLMJobResult,
    DocumentTaggingResult,
    LLMJobCreate,
    LLMJobParameters,
    LLMJobRead,
    LLMJobResult,
    LLMJobType,
    LLMJobUpdate,
    MetadataExtractionLLMJobResult,
)
from app.core.data.llm.ollama_service import OllamaService
from app.core.data.llm.prompt_templates import (
    category_word,
    reason_word,
    system_prompts,
    user_prompt_templates,
)
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

    def _update_llm_job(
        self,
        llm_job_id: str,
        status: Optional[BackgroundJobStatus] = None,
        result: Optional[LLMJobResult] = None,
        num_steps_finished: Optional[int] = None,
    ) -> LLMJobRead:
        update = LLMJobUpdate(
            status=status, result=result, num_steps_finished=num_steps_finished
        )
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
            status=BackgroundJobStatus.RUNNING, llm_job_id=llm_job_id
        )

        # TODO: parse the parameters and run the respective method
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
                    system_prompt=llmj.parameters.system_prompt,
                    user_prompt=llmj.parameters.user_prompt,
                    project_id=llmj.parameters.project_id,
                    **llmj.parameters.specific_llm_job_parameters.model_dump(
                        exclude={"llm_job_type"}
                    ),
                )

            llmj = self._update_llm_job(
                result=result,
                status=BackgroundJobStatus.FINISHED,
                llm_job_id=llm_job_id,
            )

        except Exception as e:
            logger.error(f"Cannot finish LLMJob: {e}")
            self._update_llm_job(
                status=BackgroundJobStatus.ERROR,
                llm_job_id=llm_job_id,
            )

        return llmj

    def _parse_response(self, language: str, response: str) -> Tuple[List[str], str]:
        # check that the answer contains line break
        if "\n" not in response:
            return [], "The answer has to contain a line break."

        components = re.split(r"\n+", response)

        # check that the answer contains at least 2 lines
        if len(components) < 2:
            return [], "The answer has to contain at least 2 lines."

        # check that the answer starts with expected category word
        if not components[0].startswith(f"{category_word[language]}:"):
            return [], f"The answer has to start with '{category_word[language]}:'."

        # check that the answer contains expected reason word
        if not components[1].startswith(f"{reason_word[language]}:"):
            return [], f"The answer has to contain '{reason_word[language]}:'."

        # extract the categories
        comma_separated_categories = components[0].split(":")[1].strip()
        if len(comma_separated_categories) == 0:
            categories = []
        else:
            categories = [
                category.strip() for category in comma_separated_categories.split(",")
            ]

        # extract the reason
        reason = components[1].split(":")[1].strip()

        return categories, reason

    def _llm_document_tagging(
        self,
        db: Session,
        llm_job_id: str,
        system_prompt: str,
        user_prompt: str,
        project_id: int,
        sdoc_ids: List[int],
        tag_ids: List[int],
    ) -> LLMJobResult:
        logger.info(f"Starting LLMJob - Document Tagging, num docs: {len(sdoc_ids)}")

        # read all project tags
        project = crud_project.read(db=db, id=project_id)
        tagname2id_dict = {tag.name.lower(): tag.id for tag in project.document_tags}
        tag_descriptions = "\n".join(
            [f"{tag.name} - {tag.description}" for tag in project.document_tags]
        )

        # read sdocs
        sdoc_datas = crud_sdoc.read_with_data_batch(db=db, ids=sdoc_ids)

        # automatic document tagging
        result: List[DocumentTaggingResult] = []
        for idx, sdoc_data in enumerate(sdoc_datas):
            # get current tag ids
            current_tag_ids = [
                tag.id for tag in crud_sdoc.read(db=db, id=sdoc_data.id).document_tags
            ]

            # get language
            language = crud_sdoc_meta.read_by_sdoc_and_key(
                db=db, sdoc_id=sdoc_data.id, key="language"
            ).str_value
            logger.info(f"Processing SDOC id={sdoc_data.id}, lang={language}")
            if language is None or language not in user_prompt_templates.keys():
                result.append(
                    DocumentTaggingResult(
                        sdoc_id=sdoc_data.id,
                        suggested_tag_ids=[],
                        current_tag_ids=current_tag_ids,
                        reasoning="Language not supported",
                    )
                )
                self._update_llm_job(num_steps_finished=idx + 1, llm_job_id=llm_job_id)
                continue

            # construct prompt
            system_prompt = system_prompts[language]
            user_prompt = user_prompt_templates[language][
                LLMJobType.DOCUMENT_TAGGING
            ].format(tag_descriptions, sdoc_data.content)

            # prompt the model
            response = self.ollamas.chat(
                system_prompt=system_prompt, user_prompt=user_prompt
            )
            logger.info(f"Got chat response! Response={response}")

            # parse the response
            categories, reason = self._parse_response(
                language=language, response=response
            )
            logger.info(
                f"Parsed the response! Categories={categories}, Reason={reason}"
            )

            tag_ids = [
                tagname2id_dict[category.lower()]
                for category in categories
                if category.lower() in tagname2id_dict
            ]
            logger.info(f"Mapped to tag ids! Tag IDs={tag_ids}")
            result.append(
                DocumentTaggingResult(
                    sdoc_id=sdoc_data.id,
                    suggested_tag_ids=tag_ids,
                    current_tag_ids=current_tag_ids,
                    reasoning=reason,
                )
            )
            self._update_llm_job(num_steps_finished=idx + 1, llm_job_id=llm_job_id)

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
        system_prompt: str,
        user_prompt: str,
        project_id: int,
        sdoc_ids: List[int],
        project_metadata_ids: List[int],
    ) -> LLMJobResult:
        # TODO implement the metadata extraction
        return LLMJobResult(
            llm_job_type=LLMJobType.METADATA_EXTRACTION,
            specific_llm_job_result=MetadataExtractionLLMJobResult(
                llm_job_type=LLMJobType.METADATA_EXTRACTION, results=[]
            ),
        )

    def _llm_annotation(
        self,
        db: Session,
        llm_job_id: str,
        system_prompt: str,
        user_prompt: str,
        project_id: int,
        sdoc_ids: List[int],
        project_metadata_ids: List[int],
    ) -> LLMJobResult:
        # TODO implement the annotation
        return LLMJobResult(
            llm_job_type=LLMJobType.ANNOTATION,
            specific_llm_job_result=AnnotationLLMJobResult(
                llm_job_type=LLMJobType.ANNOTATION, results=[]
            ),
        )
