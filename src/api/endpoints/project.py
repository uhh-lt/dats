from typing import List, Dict
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi import UploadFile, File
from sqlalchemy.orm import Session

from api.dependencies import skip_limit_params
from app.core.data.crud.code import crud_code
from app.core.data.crud.memo import crud_memo
from app.core.data.crud.project import crud_project
from app.core.data.crud.source_document import crud_sdoc
from app.core.data.dto import ProjectRead, ProjectCreate, ProjectUpdate
from app.core.data.dto.code import CodeRead, CodeCreate
from app.core.data.dto.memo import MemoReadProject, MemoInDB, MemoCreate
from app.core.data.dto.source_document import SourceDocumentCreate, DocTypeDict, SourceDocumentRead
from app.core.data.dto.source_document_metadata import SourceDocumentMetadataRead
from app.core.data.dto.user import UserRead
from app.core.db.sql_service import SQLService

router = APIRouter(prefix="/project")
tags = ["project"]


@router.put("", tags=tags,
            response_model=ProjectRead,
            summary="Creates a new Project",
            description="Creates a new Project.")
async def create_new_project(*,
                             db: Session = Depends(SQLService().get_db_session),
                             proj: ProjectCreate) -> ProjectRead:
    db_obj = crud_project.create(db=db, create_dto=proj)
    return ProjectRead.from_orm(db_obj)


@router.get("", tags=tags,
            response_model=List[ProjectRead],
            summary="Returns all Projects of the current user",
            description="Returns all Projects of the current user")
async def read_all(*,
                   db: Session = Depends(SQLService().get_db_session),
                   skip_limit: Dict[str, str] = Depends(skip_limit_params)) -> List[ProjectRead]:
    # TODO Flo: only return the projects of the current user
    db_objs = crud_project.read_multi(db=db, **skip_limit)
    return [ProjectRead.from_orm(proj) for proj in db_objs]


@router.get("/{id}", tags=tags,
            response_model=Optional[ProjectRead],
            summary="Returns the Project with the given ID",
            description="Returns the Project with the given ID if it exists")
async def read_project(*,
                       db: Session = Depends(SQLService().get_db_session),
                       id: int) -> Optional[ProjectRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_project.read(db=db, id=id)
    return ProjectRead.from_orm(db_obj)


@router.patch("/{id}", tags=tags,
              response_model=ProjectRead,
              summary="Updates the Project",
              description="Updates the Project with the given ID.")
async def update_project(*,
                         db: Session = Depends(SQLService().get_db_session),
                         id: int,
                         proj: ProjectUpdate) -> ProjectRead:
    # TODO Flo: only if the user has access?
    db_obj = crud_project.update(db=db, id=id, update_dto=proj)
    return ProjectRead.from_orm(db_obj)


@router.delete("/{id}", tags=tags,
               response_model=ProjectRead,
               summary="Removes the Project",
               description="Removes the Project with the given ID.")
async def delete_project(*,
                         db: Session = Depends(SQLService().get_db_session),
                         id: int) -> ProjectRead:
    # TODO Flo: only if the user has access?
    db_obj = crud_project.remove(db=db, id=id)
    return ProjectRead.from_orm(db_obj)


@router.get("/{id}/sdoc", tags=tags,
            response_model=List[SourceDocumentRead],
            summary="Returns all SourceDocuments of the Project",
            description="Returns all SourceDocuments of the Project with the given ID")
async def get_project_sdocs(*,
                            id: int,
                            db: Session = Depends(SQLService().get_db_session)) -> List[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_project.read(db=db, id=id)
    return [SourceDocumentRead.from_orm(sdoc) for sdoc in db_obj.source_documents]


@router.get("/{id}/sdoc/metadata", tags=tags,
            response_model=List[SourceDocumentMetadataRead],
            summary="Returns all SourceDocumentMetadata of the Project",
            description="Returns all SourceDocumentMetadata of the Project with the given ID")
async def get_project_sdoc_metadata(*,
                                    id: int,
                                    db: Session = Depends(SQLService().get_db_session)) \
        -> List[SourceDocumentMetadataRead]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.put("/{id}/sdoc", tags=tags,
            response_model=Optional[SourceDocumentRead],
            summary="Uploads a SourceDocument to the Project",
            description="Uploads a SourceDocument to the Project with the given ID if it exists")
# Flo: Since we're uploading a file we have to use multipart/form-data directly in the router method
#  see: https://fastapi.tiangolo.com/tutorial/request-forms-and-files/
async def upload_project_sdoc(*,
                              id: int,
                              db: Session = Depends(SQLService().get_db_session),
                              file: UploadFile = File(..., description="The file represented by the SourceDocument")) \
        -> Optional[SourceDocumentRead]:
    # TODO Flo: only if the user has access?
    # TODO Flo: Support other MIME Types
    if not file.content_type == "text/plain":
        raise HTTPException(detail="Only plain text files allowed!", status_code=406)

    txt_content = await file.read()
    create_dto = SourceDocumentCreate(content=txt_content.decode("utf-8"),
                                      filename=file.filename,
                                      doctype=DocTypeDict[file.content_type],
                                      project_id=id)

    sdoc_db_obj = crud_sdoc.create(db=db, create_dto=create_dto)

    return SourceDocumentRead.from_orm(sdoc_db_obj)


@router.delete("/{id}/sdoc", tags=tags,
               response_model=Optional[ProjectRead],
               summary="Removes all SourceDocuments of the Project",
               description="Removes all SourceDocuments of the Project with the given ID if it exists")
async def delete_project_sdocs(*,
                               id: int,
                               db: Session = Depends(SQLService().get_db_session)) -> Optional[ProjectRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_project.remove_all_source_documents(db=db, id=id)
    return ProjectRead.from_orm(db_obj)


@router.patch("/{id}/user/{user_id}", tags=tags,
              response_model=Optional[UserRead],
              summary="Associates the User with the Project",
              description="Associates an existing User to the Project with the given ID if it exists")
async def associate_user_to_project(*,
                                    id: int,
                                    user_id: int,
                                    db: Session = Depends(SQLService().get_db_session)) -> Optional[UserRead]:
    # TODO Flo: only if the user has access?
    user_db_obj = crud_project.associate_user(db=db, id=id, user_id=user_id)
    return UserRead.from_orm(user_db_obj)


@router.delete("/{id}/user/{user_id}", tags=tags,
               response_model=Optional[UserRead],
               summary="Dissociates the Users with the Project",
               description="Dissociates the Users with the Project with the given ID if it exists")
async def dissociate_user_from_project(*,
                                       id: int,
                                       user_id: int,
                                       db: Session = Depends(SQLService().get_db_session)) -> Optional[UserRead]:
    # TODO Flo: only if the user has access?
    user_db_obj = crud_project.dissociate_user(db=db, id=id, user_id=user_id)
    return UserRead.from_orm(user_db_obj)


@router.get("/{id}/user", tags=tags,
            response_model=List[UserRead],
            summary="Returns all Users of the Project",
            description="Returns all Users of the Project with the given ID")
async def get_project_users(*,
                            id: int,
                            db: Session = Depends(SQLService().get_db_session)) -> List[UserRead]:
    # TODO Flo: only if the user has access?
    proj_db_obj = crud_project.read(db=db, id=id)
    return [UserRead.from_orm(user) for user in proj_db_obj.users]


@router.get("/{id}/code", tags=tags,
            response_model=List[CodeRead],
            summary="Returns all Codes of the Project",
            description="Returns all Codes of the Project with the given ID")
async def get_project_codes(*,
                            id: int,
                            db: Session = Depends(SQLService().get_db_session)) -> List[CodeRead]:
    # TODO Flo: only if the user has access?
    proj_db_obj = crud_project.read(db=db, id=id)
    return [CodeRead.from_orm(code) for code in proj_db_obj.codes]


@router.put("/{id}/code", tags=tags,
            response_model=Optional[CodeRead],
            summary="Creates a new Code in the Project",
            description="Creates a new Code in the Project with the given ID")
async def create_project_code(*,
                              id: int,
                              db: Session = Depends(SQLService().get_db_session),
                              code: CodeCreate) -> Optional[CodeRead]:
    # Flo: Do we really want to create codes here and not at PUT/code !? Since a code is owned by a project and a user
    #  it would make more sense for me tbh. Then we would also not need to check id == code.project_id
    if not code.project_id == id:
        raise ValueError("Code.project_id does not match project id")
    # TODO Flo: only if the user has access?
    db_obj = crud_code.create(db=db, create_dto=code)
    return CodeRead.from_orm(db_obj)


@router.delete("/{id}/code", tags=tags,
               response_model=Optional[ProjectRead],
               summary="Removes all Codes of the Project",
               description="Removes all Codes of the Project with the given ID if it exists")
async def delete_project_codes(*,
                               id: int,
                               db: Session = Depends(SQLService().get_db_session)) -> Optional[ProjectRead]:
    # TODO Flo: only if the user has access?
    db_obj = crud_project.remove_all_codes(db=db, id=id)
    return ProjectRead.from_orm(db_obj)


@router.get("/{id}/logbook", tags=tags,
            response_model=Optional[MemoReadProject],
            summary="Returns the LogBook Memo of the current User for the Project.",
            description="Returns the LogBook Memo of the current User for the Project with the given ID.")
async def get_logbook_memo(*,
                           db: Session = Depends(SQLService().get_db_session),
                           id: int) -> Optional[MemoReadProject]:
    proj_db_obj = crud_project.read(db=db, id=id)
    memo_as_in_db_dto = MemoInDB.from_orm(proj_db_obj.object_handle.attached_memo)
    return MemoReadProject(**memo_as_in_db_dto.dict(exclude={"attached_to"}), attached_project_id=proj_db_obj.id)


@router.put("/{id}/logbook", tags=tags,
            response_model=Optional[MemoReadProject],
            summary="Adds a LogBook Memo of the current User to the Project.",
            description="Adds a LogBook Memo of the current User to the Project with the given ID if it exists")
async def add_memo(*,
                   db: Session = Depends(SQLService().get_db_session),
                   id: int,
                   memo: MemoCreate) -> Optional[MemoReadProject]:
    db_obj = crud_memo.create_for_project(db=db, project_id=id, create_dto=memo)
    memo_as_in_db_dto = MemoInDB.from_orm(db_obj)
    attached_project = db_obj.attached_to.project
    return MemoReadProject(**memo_as_in_db_dto.dict(exclude={"attached_to"}), attached_project_id=attached_project.id)
