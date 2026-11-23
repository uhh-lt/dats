from fastapi import APIRouter, Depends

from common.dependencies import DBSession, get_current_user
from core.auth.authz_user import AuthzUser
from modules.document_sampler.document_sampler import document_sampler_by_tags
from modules.document_sampler.document_sampler_dto import SampledSdocsResults

router = APIRouter(
    prefix="/document_sampler",
    dependencies=[Depends(get_current_user)],
    tags=["document_sampler"],
)


# --- other operations


@router.post(
    "/sample_sdocs_by_tags",
    response_model=list[SampledSdocsResults],
    summary="Sample & Aggregate Source Documents by tags.",
)
def sample_sdocs_by_tags(
    *,
    db: DBSession,
    project_id: int,
    tag_groups: list[list[int]],
    n: int,
    frac: float,
    authz_user: AuthzUser = Depends(),
) -> list[SampledSdocsResults]:
    authz_user.assert_in_project(project_id)
    return document_sampler_by_tags(
        db=db, project_id=project_id, tag_ids=tag_groups, n=n, frac=frac
    )
