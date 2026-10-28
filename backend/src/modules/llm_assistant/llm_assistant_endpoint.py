from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.prompt_template.prompt_template_enum import TaskType
from modules.llm_assistant.llm_assistant_enum import ApproachType
from modules.llm_assistant.llm_assistant_service import LLMAssistantService

router = APIRouter(
    prefix="/llm_assistant",
    dependencies=[Depends(get_current_user)],
    tags=["llm_assistant"],
)

llmas: LLMAssistantService = LLMAssistantService()


@router.post(
    "/count_existing_assistant_annotations",
    response_model=dict[int, int],
    summary="Based on the approach, count the number of existing assistant annotations",
)
def count_existing_assistant_annotations(
    *,
    db: Session = Depends(get_db_session),
    sdoc_ids: list[int],
    code_ids: list[int],
    task_type: TaskType,
    approach_type: ApproachType,
    authz_user: AuthzUser = Depends(),
) -> dict[int, int]:
    authz_user.assert_in_same_project_as_many(Crud.SOURCE_DOCUMENT, sdoc_ids)
    authz_user.assert_in_same_project_as_many(Crud.CODE, code_ids)

    return llmas.count_existing_assistant_annotations(
        db=db,
        approach_type=approach_type,
        task_type=task_type,
        sdoc_ids=sdoc_ids,
        code_ids=code_ids,
    )
