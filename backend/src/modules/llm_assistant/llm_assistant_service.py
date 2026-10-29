from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.span_annotation_crud import crud_span_anno
from core.doc.source_document_crud import crud_sdoc
from core.prompt_template.prompt_template_enum import TaskType
from core.user.user_crud import (
    ASSISTANT_FEWSHOT_ID,
    ASSISTANT_ZEROSHOT_ID,
)
from modules.llm_assistant.llm_assistant_enum import ApproachType
from modules.llm_assistant.llm_assistant_exceptions import (
    LLMAssistantDocumentsNotInProjectError,
)
from repos.llm_repo import LLMRepo
from repos.ray.ray_repo import RayRepo
from repos.vector.weaviate_repo import WeaviateRepo


class LLMAssistantService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.llm: LLMRepo = LLMRepo()
        cls.ray: RayRepo = RayRepo()
        cls.weaviate: WeaviateRepo = WeaviateRepo()
        return super(LLMAssistantService, cls).__new__(cls)

    def assert_documents_in_project(
        self, db: Session, *, project_id: int, sdoc_ids: list[int]
    ) -> None:
        """
        Check that the documents of an LLM Assistant job belong to its project, so
        a member of one project cannot run the assistant on another project's
        documents.

        Raises:
            LLMAssistantDocumentsNotInProjectError: If a document does not exist or
                belongs to another project.
        """
        sdoc_by_id = crud_sdoc.read_existing_by_ids(db=db, ids=sdoc_ids)
        foreign_ids = [
            sdoc_id
            for sdoc_id in dict.fromkeys(sdoc_ids)
            if sdoc_id not in sdoc_by_id or sdoc_by_id[sdoc_id].project_id != project_id
        ]
        if foreign_ids:
            raise LLMAssistantDocumentsNotInProjectError(
                project_id=project_id, sdoc_ids=foreign_ids
            )

    def count_existing_assistant_annotations(
        self,
        db: Session,
        task_type: TaskType,
        code_ids: list[int],
        sdoc_ids: list[int],
        approach_type: ApproachType,
    ) -> dict[int, int]:
        approachtype2userid = {
            ApproachType.LLM_ZERO_SHOT: ASSISTANT_ZEROSHOT_ID,
            ApproachType.LLM_FEW_SHOT: ASSISTANT_FEWSHOT_ID,
        }
        user_id = approachtype2userid[approach_type]

        match task_type:
            case TaskType.SENTENCE_ANNOTATION:
                # 1. Find existing annotations
                existing_annotations = crud_sentence_anno.read_by_user_sdocs_codes(
                    db=db,
                    user_id=user_id,
                    sdoc_ids=sdoc_ids,
                    code_ids=code_ids,
                )
            case TaskType.ANNOTATION:
                # 1. Find existing annotations
                existing_annotations = crud_span_anno.read_by_user_sdocs_codes(
                    db=db,
                    user_id=user_id,
                    sdoc_ids=sdoc_ids,
                    code_ids=code_ids,
                )
            case _:
                return {}

        # 2. Count the number of existing annotations per code
        code_id2num_existing_annos = {code_id: 0 for code_id in code_ids}
        for existing_anno in existing_annotations:
            code_id2num_existing_annos[existing_anno.code_id] += 1

        return code_id2num_existing_annos
