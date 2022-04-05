from typing import Union

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.data.crud.memo import crud_memo
from app.core.data.dto.memo import MemoReadCode, MemoReadSpanAnnotation, MemoReadAnnotationDocument, MemoReadProject, \
    MemoReadSourceDocument, MemoUpdate, MemoReadDocumentTag
from app.core.db.sql_service import SQLService

router = APIRouter(prefix="/memo")
tags = ["memo"]

session = SQLService().get_db_session


@router.get("/{memo_id}", tags=tags,
            response_model=Union[MemoReadCode,
                                 MemoReadSpanAnnotation,
                                 MemoReadAnnotationDocument,
                                 MemoReadSourceDocument,
                                 MemoReadProject,
                                 MemoReadDocumentTag],
            summary="Returns the Memo",
            description="Returns the Memo with the given ID if it exists")
async def get_by_id(*,
                    db: Session = Depends(session),
                    memo_id: int) -> Union[MemoReadCode,
                                           MemoReadSpanAnnotation,
                                           MemoReadAnnotationDocument,
                                           MemoReadSourceDocument,
                                           MemoReadProject,
                                           MemoReadDocumentTag]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.read(db=db, id=memo_id)
    return crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj)


@router.patch("/{memo_id}", tags=tags,
              response_model=Union[MemoReadCode,
                                   MemoReadSpanAnnotation,
                                   MemoReadAnnotationDocument,
                                   MemoReadSourceDocument,
                                   MemoReadProject,
                                   MemoReadDocumentTag],
              summary="Updates the Memo",
              description="Updates the Memo with the given ID if it exists")
async def update_by_id(*,
                       db: Session = Depends(session),
                       memo_id: int,
                       memo: MemoUpdate) -> Union[MemoReadCode,
                                                  MemoReadSpanAnnotation,
                                                  MemoReadAnnotationDocument,
                                                  MemoReadSourceDocument,
                                                  MemoReadProject,
                                                  MemoReadDocumentTag]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.update(db=db, id=memo_id, update_dto=memo)
    return crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj)


@router.delete("/{memo_id}", tags=tags,
               response_model=Union[MemoReadCode,
                                    MemoReadSpanAnnotation,
                                    MemoReadAnnotationDocument,
                                    MemoReadSourceDocument,
                                    MemoReadProject,
                                    MemoReadDocumentTag],
               summary="Removes the Memo",
               description="Removes the Memo with the given ID if it exists")
async def delete_by_id(*,
                       db: Session = Depends(session),
                       memo_id: int) -> Union[MemoReadCode,
                                              MemoReadSpanAnnotation,
                                              MemoReadAnnotationDocument,
                                              MemoReadSourceDocument,
                                              MemoReadProject,
                                              MemoReadDocumentTag]:
    # TODO Flo: only if the user has access?
    db_obj = crud_memo.remove(db=db, id=memo_id)
    return crud_memo.get_memo_read_dto_from_orm(db=db, db_obj=db_obj)
