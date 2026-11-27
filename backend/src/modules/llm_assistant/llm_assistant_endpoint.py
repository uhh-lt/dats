from common.dependencies import DBSession
from common.project_router import project_router
from core.prompt.prompt_enum import TaskType
from modules.llm_assistant.llm_assistant_service import LLMAssistantService

router = project_router("/llm-assistant", tags=["llmAssistant"])

llmas: LLMAssistantService = LLMAssistantService()


# --- other operations


@router.post(
    "/existing-annotation-counts",
    response_model=dict[int, int],
    summary=(
        "Count the existing annotations of a virtual user per code, for the "
        "documents and codes of an LLM Assistant run"
    ),
)
def compute_existing_annotation_counts(
    *,
    db: DBSession,
    project_id: int,
    sdoc_ids: list[int],
    code_ids: list[int],
    task_type: TaskType,
    virtual_user_id: int,
) -> dict[int, int]:
    return llmas.count_existing_assistant_annotations(
        db=db,
        project_id=project_id,
        virtual_user_id=virtual_user_id,
        task_type=task_type,
        sdoc_ids=sdoc_ids,
        code_ids=code_ids,
    )
