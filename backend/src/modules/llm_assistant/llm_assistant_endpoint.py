from common.dependencies import DBSession
from common.project_router import project_router
from modules.llm_assistant.llm_assistant_dto import ExistingAnnotationCountsRequest
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
    request: ExistingAnnotationCountsRequest,
) -> dict[int, int]:
    return llmas.count_existing_assistant_annotations(
        db=db,
        project_id=project_id,
        virtual_user_id=request.virtual_user_id,
        task_type=request.task_type,
        sdoc_ids=request.sdoc_ids,
        code_ids=request.code_ids,
    )
