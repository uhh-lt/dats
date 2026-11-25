from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.span_annotation_crud import crud_span_anno
from core.prompt.prompt_enum import TaskType
from repos.llm_repo import LLMRepo
from repos.ray.ray_repo import RayRepo
from repos.vector.weaviate_repo import WeaviateRepo


class LLMAssistantService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.llm: LLMRepo = LLMRepo()
        cls.ray: RayRepo = RayRepo()
        cls.weaviate: WeaviateRepo = WeaviateRepo()
        return super(LLMAssistantService, cls).__new__(cls)

    def count_existing_assistant_annotations(
        self,
        db: Session,
        task_type: TaskType,
        code_ids: list[int],
        sdoc_ids: list[int],
        virtual_user_id: int,
    ) -> dict[int, int]:
        """Count the annotations of the virtual user per code, the ones a run with
        `delete_existing_annotations` would delete."""

        match task_type:
            case TaskType.SENTENCE_ANNOTATION:
                # 1. Find existing annotations
                existing_annotations = crud_sentence_anno.read_by_user_sdocs_codes(
                    db=db,
                    user_id=virtual_user_id,
                    sdoc_ids=sdoc_ids,
                    code_ids=code_ids,
                )
            case TaskType.ANNOTATION:
                # 1. Find existing annotations
                existing_annotations = crud_span_anno.read_by_user_sdocs_codes(
                    db=db,
                    user_id=virtual_user_id,
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
