from typing import List, Optional
from uuid import uuid4

from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.code.code_dto import CodeRead
from core.doc.folder_crud import crud_folder
from core.doc.folder_dto import FolderTreeRead
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_orm import SourceDocumentORM
from core.memo.memo_crud import crud_memo
from core.memo.memo_dto import AttachedObjectType, MemoCreateIntern, MemoInDB, MemoRead
from core.memo.memo_util import get_object_memo_for_user
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.project_metadata_dto import ProjectMetadataRead
from core.project.project_crud import crud_project
from core.project.project_dto import (
    ProjectAddUser,
    ProjectCreate,
    ProjectRead,
    ProjectUpdate,
)
from core.tag.document_tag_dto import DocumentTagRead
from core.user.user_crud import crud_user
from core.user.user_dto import UserRead
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from modules.analysis.duplicate_finder.duplicate_finder import find_duplicates
from modules.perspectives.aspect_dto import AspectRead
from preprocessing.preprocessing_job_dto import PreprocessingJobRead
from preprocessing.preprocessing_service import PreprocessingService
from repos.db.crud_base import NoSuchElementError
from repos.elasticsearch_repo import ElasticSearchService
from sqlalchemy.orm import Session

router = APIRouter(
    prefix="/project",
    dependencies=[Depends(get_current_user)],
    tags=["project"],
)


@router.put(
    "",
    response_model=ProjectRead,
    summary="Creates a new Project",
)
def create_new_project(
    *,
    db: Session = Depends(get_db_session),
    proj: ProjectCreate,
    current_user: UserRead = Depends(get_current_user),
) -> ProjectRead:
    db_obj = crud_project.create(db=db, create_dto=proj, creating_user=current_user)

    try:
        # create the ES Indices
        ElasticSearchService().create_project_indices(proj_id=db_obj.id)
    except Exception:
        crud_project.remove(db=db, id=db_obj.id)
        raise HTTPException(
            status_code=500,
            detail="Cannot create ElasticSearch Indices for the Project!",
        )
    return ProjectRead.model_validate(db_obj)


@router.get(
    "/{proj_id}",
    response_model=ProjectRead,
    summary="Returns the Project with the given ID if it exists",
)
def read_project(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    authz_user: AuthzUser = Depends(),
) -> ProjectRead:
    authz_user.assert_in_project(proj_id)

    db_obj = crud_project.read(db=db, id=proj_id)
    return ProjectRead.model_validate(db_obj)


@router.patch(
    "/{proj_id}",
    response_model=ProjectRead,
    summary="Updates the Project with the given ID.",
)
def update_project(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    proj: ProjectUpdate,
    authz_user: AuthzUser = Depends(),
) -> ProjectRead:
    authz_user.assert_in_project(proj_id)
    db_obj = crud_project.update(db=db, id=proj_id, update_dto=proj)
    return ProjectRead.model_validate(db_obj)


@router.delete(
    "/{proj_id}",
    response_model=ProjectRead,
    summary="Removes the Project with the given ID.",
)
def delete_project(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    authz_user: AuthzUser = Depends(),
) -> ProjectRead:
    authz_user.assert_in_project(proj_id)

    db_obj = crud_project.remove(db=db, id=proj_id)

    try:
        # remove the ES Indices # Flo Do we want this?!
        ElasticSearchService().remove_project_indices(proj_id=db_obj.id)
    except Exception:
        crud_project.remove(db=db, id=db_obj.id)
        raise HTTPException(
            status_code=500,
            detail="Cannot create ElasticSearch Indices for the Project!",
        )

    return ProjectRead.model_validate(db_obj)


@router.put(
    "/{proj_id}/sdoc",
    response_model=PreprocessingJobRead,
    summary="Uploads one or multiple SourceDocument to the Project with the given ID if it exists",
)
# Flo: Since we're uploading a file we have to use multipart/form-data directly in the router method
#  see: https://fastapi.tiangolo.com/tutorial/request-forms-and-files/
#  see: https://fastapi.tiangolo.com/tutorial/request-files/#multiple-file-uploads-with-additional-metadata
def upload_project_sdoc(
    *,
    proj_id: int,
    uploaded_files: List[UploadFile] = File(
        ...,
        description=(
            "File(s) that get uploaded and represented by the SourceDocument(s)"
        ),
    ),
    authz_user: AuthzUser = Depends(),
) -> PreprocessingJobRead:
    authz_user.assert_in_project(proj_id)

    pps: PreprocessingService = PreprocessingService()
    return pps.prepare_and_start_preprocessing_job_async(
        proj_id=proj_id, uploaded_files=uploaded_files
    )


@router.patch(
    "/{proj_id}/user",
    response_model=UserRead,
    summary="Associates an existing User to the Project with the given ID if it exists",
)
def associate_user_to_project(
    *,
    proj_id: int,
    user: ProjectAddUser,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> UserRead:
    authz_user.assert_in_project(proj_id)

    user_db_obj = crud_user.read_by_email(db=db, email=user.email)
    crud_project.associate_user(db=db, proj_id=proj_id, user_id=user_db_obj.id)
    return UserRead.model_validate(user_db_obj)


@router.delete(
    "/{proj_id}/user/{user_id}",
    response_model=UserRead,
    summary="Dissociates the Users with the Project with the given ID if it exists",
)
def dissociate_user_from_project(
    *,
    proj_id: int,
    user_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> UserRead:
    authz_user.assert_in_project(proj_id)

    user_db_obj = crud_project.dissociate_user(db=db, proj_id=proj_id, user_id=user_id)
    return UserRead.model_validate(user_db_obj)


@router.get(
    "/{proj_id}/user",
    response_model=List[UserRead],
    summary="Returns all Users of the Project with the given ID",
)
def get_project_users(
    *,
    proj_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[UserRead]:
    authz_user.assert_in_project(proj_id)

    proj_db_obj = crud_project.read(db=db, id=proj_id)
    return [UserRead.model_validate(user) for user in proj_db_obj.users]


@router.get(
    "/{proj_id}/code",
    response_model=List[CodeRead],
    summary="Returns all Codes of the Project with the given ID",
)
def get_project_codes(
    *,
    proj_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[CodeRead]:
    authz_user.assert_in_project(proj_id)

    proj_db_obj = crud_project.read(db=db, id=proj_id)
    result = [CodeRead.model_validate(code) for code in proj_db_obj.codes]
    result.sort(key=lambda c: c.id)
    return result


@router.get(
    "/{proj_id}/tag",
    response_model=List[DocumentTagRead],
    summary="Returns all DocumentTags of the Project with the given ID",
)
def get_project_tags(
    *,
    proj_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[DocumentTagRead]:
    authz_user.assert_in_project(proj_id)

    proj_db_obj = crud_project.read(db=db, id=proj_id)
    return [DocumentTagRead.model_validate(tag) for tag in proj_db_obj.document_tags]


@router.get(
    "/{proj_id}/user/memo",
    response_model=List[MemoRead],
    summary="Returns all Memos of the Project from the logged-in User",
)
def get_user_memos_of_project(
    *,
    proj_id: int,
    only_starred: Optional[bool] = Query(
        title="Only Starred",
        description="If true only starred Memos are returned",
        default=False,
    ),
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[MemoRead]:
    authz_user.assert_in_project(proj_id)

    db_objs = crud_memo.read_by_user_and_project(
        db=db, user_id=authz_user.user.id, proj_id=proj_id, only_starred=only_starred
    )
    return [
        crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj) for db_obj in db_objs
    ]


@router.get(
    "/{proj_id}/memo/user",
    response_model=MemoRead,
    summary=(
        "Gets or creates the Memo attached to the Project with the given ID of the logged-in User."
    ),
)
def get_or_create_user_memo(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    authz_user: AuthzUser = Depends(),
) -> MemoRead:
    authz_user.assert_in_project(proj_id)

    db_obj = crud_project.read(db=db, id=proj_id)
    try:
        return get_object_memo_for_user(db_obj=db_obj, user_id=authz_user.user.id)
    except NoSuchElementError:
        db_obj = crud_memo.create_for_attached_object(
            db=db,
            attached_object_id=proj_id,
            attached_object_type=AttachedObjectType.project,
            create_dto=MemoCreateIntern(
                uuid=str(uuid4()),
                title="Project Memo",
                content="",
                content_json="",
                starred=False,
                user_id=authz_user.user.id,
                project_id=proj_id,
            ),
        )
    memo_as_in_db_dto = MemoInDB.model_validate(db_obj)
    return MemoRead(
        **memo_as_in_db_dto.model_dump(exclude={"attached_to"}),
        attached_object_id=proj_id,
        attached_object_type=AttachedObjectType.project,
    )


@router.get(
    "/{proj_id}/resolve_filename/{filename}",
    response_model=int,
    summary=(
        "Returns the Id of the SourceDocument identified by project_id and filename if it exists"
    ),
)
def resolve_filename(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    filename: str,
    only_finished: bool = True,
    authz_user: AuthzUser = Depends(),
) -> int:
    authz_user.assert_in_project(proj_id)

    sdoc = crud_sdoc.read_by_filename(
        db=db, proj_id=proj_id, only_finished=only_finished, filename=filename
    )
    if sdoc is None:
        raise NoSuchElementError(
            SourceDocumentORM, project_id=proj_id, filename=filename
        )
    return sdoc.id


@router.get(
    "/{proj_id}/metadata",
    response_model=List[ProjectMetadataRead],
    summary="Returns all ProjectMetadata of the Project with the given ID if it exists",
)
def get_all_metadata(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[ProjectMetadataRead]:
    authz_user.assert_in_project(proj_id)

    db_objs = crud_project_meta.read_by_project(db=db, proj_id=proj_id)
    metadata = [ProjectMetadataRead.model_validate(meta) for meta in db_objs]
    return metadata


@router.get(
    "/{proj_id}/aspects",
    response_model=List[AspectRead],
    summary="Returns all Aspects of the Project with the given ID if it exists",
)
def get_all_aspects(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    authz_user: AuthzUser = Depends(),
) -> List[AspectRead]:
    authz_user.assert_in_project(proj_id)

    project = crud_project.read(db=db, id=proj_id)
    aspects = [AspectRead.model_validate(a) for a in project.aspects]
    return aspects


@router.post(
    "/{proj_id}/find_duplicate_text_sdocs",
    response_model=List[List[int]],
    summary="Returns groups of duplicate sdoc ids.",
)
def find_duplicate_text_sdocs(
    *,
    db: Session = Depends(get_db_session),
    proj_id: int,
    max_different_words: int,
    authz_user: AuthzUser = Depends(),
) -> List[List[int]]:
    authz_user.assert_in_project(proj_id)
    return find_duplicates(project_id=proj_id, max_different_words=max_different_words)


@router.get(
    "/tree/{project_id}",
    response_model=List[FolderTreeRead],
    summary="Returns the folder tree of the project with the given ID",
)
def get_folder_tree(
    project_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> List[FolderTreeRead]:
    authz_user.assert_in_project(project_id)

    folders = crud_folder.read_by_project(db=db, proj_id=project_id)

    folder_map = {
        folder.id: FolderTreeRead.model_validate(folder) for folder in folders
    }

    for folder in folders:
        if folder.parent_id is not None:
            parent_tree = folder_map.get(folder.parent_id)
            if parent_tree:
                parent_tree.children.append(folder_map[folder.id])

    return [folder_map[folder.id] for folder in folders if folder.parent_id is None]
