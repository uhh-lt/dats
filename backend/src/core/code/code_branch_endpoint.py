from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.code.code_branch_crud import crud_code_branch
from core.code.code_branch_dto import CodeBranchCreate, CodeBranchRead
from core.code.code_dto import (
    CodeBranchChangeRead,
    CodeMerge,
    CodeMergeConflictResponse,
    CodeMergeResult,
    CodeRead,
    CodeResolveConflict,
)
from core.code.code_service import code_service

router = APIRouter(
    prefix="/code-branch",
    dependencies=[Depends(get_current_user)],
    tags=["codeBranch"],
)


@router.put(
    "", response_model=CodeBranchRead, summary="Creates a collaborative branch."
)
def create_branch(
    *,
    create: CodeBranchCreate,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> CodeBranchRead:
    authz_user.assert_in_project(create.project_id)
    return CodeBranchRead.model_validate(
        crud_code_branch.create_for_user(
            db, create_dto=create, user_id=authz_user.user.id
        )
    )


@router.get(
    "/project/{project_id}",
    response_model=list[CodeBranchRead],
    summary="Lists project branches.",
)
def list_branches(
    *,
    project_id: int,
    include_archived: bool = Query(default=False),
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[CodeBranchRead]:
    authz_user.assert_in_project(project_id)
    return [
        CodeBranchRead.model_validate(branch)
        for branch in crud_code_branch.read_by_project(
            db, project_id=project_id, include_archived=include_archived
        )
    ]


@router.post(
    "/{branch_id}/merge",
    response_model=CodeMergeResult,
    responses={409: {"model": CodeMergeConflictResponse}},
    summary="Merges selected or all active branch changes into Main.",
)
def merge_branch(
    *,
    branch_id: int,
    merge: CodeMerge,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> CodeMergeResult:
    branch = crud_code_branch.read(db, branch_id)
    authz_user.assert_in_project(branch.project_id)
    merged, discarded = code_service.merge(
        db,
        branch_id=branch_id,
        merge_dto=merge,
        author_id=authz_user.user.id,
    )
    return CodeMergeResult(
        merged=[CodeRead.model_validate(code) for code in merged],
        discarded_concept_ids=discarded,
    )


@router.get(
    "/{branch_id}/changes",
    response_model=list[CodeBranchChangeRead],
    summary="Lists active branch changes and their Main comparison snapshots.",
)
def list_branch_changes(
    *,
    branch_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[CodeBranchChangeRead]:
    branch = crud_code_branch.read(db, branch_id)
    authz_user.assert_in_project(branch.project_id)
    return code_service.read_branch_changes(db, branch_id=branch_id)


@router.post(
    "/{branch_id}/resolve-conflict",
    response_model=CodeRead | None,
    summary="Keeps or discards one conflicting branch change.",
)
def resolve_conflict(
    *,
    branch_id: int,
    resolution: CodeResolveConflict,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> CodeRead | None:
    branch = crud_code_branch.read(db, branch_id)
    authz_user.assert_in_project(branch.project_id)
    code = code_service.resolve_conflict(
        db,
        branch_id=branch_id,
        concept_id=resolution.concept_id,
        resolution=resolution.resolution,
        author_id=authz_user.user.id,
        commit_message=resolution.commit_message,
    )
    return CodeRead.model_validate(code) if code is not None else None


@router.delete(
    "/{branch_id}",
    response_model=CodeBranchRead,
    summary="Archives a branch and discards its active changes.",
)
def archive_branch(
    *,
    branch_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> CodeBranchRead:
    branch = crud_code_branch.read(db, branch_id)
    authz_user.assert_in_project(branch.project_id)
    branch = code_service.archive_branch(db, branch_id=branch_id)
    return CodeBranchRead.model_validate(branch)
