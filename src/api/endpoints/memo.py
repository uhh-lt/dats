from typing import Union

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.data.dto.memo import MemoReadCode, MemoReadSpanAnnotation, MemoReadAnnotationDocument, MemoReadProject
from app.core.db.sql_service import SQLService

router = APIRouter(prefix="/memo")
tags = ["memo"]


@router.get("/{id}", tags=tags,
            response_model=Union[MemoReadCode, MemoReadSpanAnnotation, MemoReadAnnotationDocument, MemoReadProject],
            summary="Returns the Memo",
            description="Returns the Memo with the given ID if it exists")
async def get_by_id(*,
                    db: Session = Depends(SQLService().get_db_session),
                    id: int) \
        -> Union[MemoReadCode, MemoReadSpanAnnotation, MemoReadAnnotationDocument, MemoReadProject]:
    # db_obj = crud_memo.read(db=db, id=id)
    raise NotImplementedError()


@router.patch("/{id}", tags=tags,
              response_model=Union[MemoReadCode, MemoReadSpanAnnotation, MemoReadAnnotationDocument, MemoReadProject],
              summary="Updates the Memo",
              description="Updates the Memo with the given ID if it exists")
async def update_by_id(*,
                       db: Session = Depends(SQLService().get_db_session),
                       id: int) \
        -> Union[MemoReadCode, MemoReadSpanAnnotation, MemoReadAnnotationDocument, MemoReadProject]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()


@router.delete("/{id}", tags=tags,
               response_model=Union[MemoReadCode, MemoReadSpanAnnotation, MemoReadAnnotationDocument, MemoReadProject],
               summary="Removes the Memo",
               description="Removes the Memo with the given ID if it exists")
async def delete_by_id(*,
                       db: Session = Depends(SQLService().get_db_session),
                       id: int) \
        -> Union[MemoReadCode, MemoReadSpanAnnotation, MemoReadAnnotationDocument, MemoReadProject]:
    # TODO Flo: only if the user has access?
    raise NotImplementedError()
