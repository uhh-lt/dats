from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from core.auth.authz_user import AuthzUser
from core.project.project_crud import crud_project
from modules.classifier.classifier_crud import crud_classifier
from modules.classifier.classifier_dto import (
    ClassifierData,
    ClassifierModel,
    ClassifierRead,
    ClassifierUpdate,
)

router = APIRouter(
    prefix="/classifier", dependencies=[Depends(get_current_user)], tags=["classifier"]
)


@router.get(
    "/project/{proj_id}",
    response_model=list[ClassifierRead],
    summary="Returns all Classifiers of the Project with the given ID",
)
def get_by_project(
    *,
    proj_id: int,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[ClassifierRead]:
    authz_user.assert_in_project(proj_id)

    proj_db_obj = crud_project.read(db=db, id=proj_id)
    result = [ClassifierRead.model_validate(c) for c in proj_db_obj.classifiers]
    result.sort(key=lambda c: c.id)
    return result


@router.patch(
    "/{classifier_id}",
    response_model=ClassifierRead,
    summary="Updates the Classifier with the given ID.",
)
def update_by_id(
    *,
    db: Session = Depends(get_db_session),
    classifier_id: int,
    classifier: ClassifierUpdate,
    authz_user: AuthzUser = Depends(),
) -> ClassifierRead:
    authz_user.assert_in_same_project_as(Crud.CLASSIFIER, classifier_id)
    db_obj = crud_classifier.update(db=db, id=classifier_id, update_dto=classifier)
    return ClassifierRead.model_validate(db_obj)


@router.delete(
    "/{classifier_id}",
    response_model=ClassifierRead,
    summary="Deletes the Classifier with the given ID.",
)
def delete_by_id(
    *,
    db: Session = Depends(get_db_session),
    classifier_id: int,
    authz_user: AuthzUser = Depends(),
) -> ClassifierRead:
    authz_user.assert_in_same_project_as(Crud.CLASSIFIER, classifier_id)

    db_obj = crud_classifier.read(db=db, id=classifier_id)
    classifier_read = ClassifierRead.model_validate(db_obj)

    crud_classifier.delete(db=db, id=classifier_id)
    return classifier_read


@router.post(
    "/project/{proj_id}/datasetstatistics",
    response_model=list[ClassifierData],
    summary="Returns statistics of the dataset that would be created with these parameters",
)
def compute_dataset_statistics(
    *,
    proj_id: int,
    sdoc_ids: list[int],
    user_ids: list[int],
    class_ids: list[int],
    model: ClassifierModel,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> list[ClassifierData]:
    authz_user.assert_in_project(proj_id)

    dataset = crud_classifier.read_dataset(
        db=db, model=model, sdoc_ids=sdoc_ids, user_ids=user_ids, class_ids=class_ids
    )
    return [ClassifierData.model_validate(d) for d in dataset]
