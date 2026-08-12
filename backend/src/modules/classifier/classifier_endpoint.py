from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from common.crud_enum import Crud
from common.dependencies import get_current_user, get_db_session
from config import conf
from core.auth.authz_user import AuthzUser
from core.project.project_crud import crud_project
from modules.classifier.classifier_crud import crud_classifier
from modules.classifier.classifier_dto import (
    ClassifierBaseModelOption,
    ClassifierDatasetStatistics,
    ClassifierDatasetStatisticsRequest,
    ClassifierInfo,
    ClassifierRead,
    ClassifierTrainingSettings,
    ClassifierUpdate,
)
from modules.classifier.classifier_service import ClassifierService

router = APIRouter(
    prefix="/classifier", dependencies=[Depends(get_current_user)], tags=["classifier"]
)


@router.get(
    "/info",
    response_model=ClassifierInfo,
    summary="Returns classifier models, thresholds, and training defaults",
)
def get_classifier_info(
    authz_user: AuthzUser = Depends(),
) -> ClassifierInfo:
    return ClassifierInfo(
        weak_signal_threshold=conf.classifier.weak_signal_threshold,
        strong_signal_threshold=conf.classifier.strong_signal_threshold,
        transformer_models=[
            ClassifierBaseModelOption(value=m.value, label=m.label)
            for m in conf.classifier.transformer_models
        ],
        embedding_models=[
            ClassifierBaseModelOption(value=m.value, label=m.label)
            for m in conf.classifier.embedding_models
        ],
        training_params=ClassifierTrainingSettings.model_validate(
            conf.classifier.training_params.model_dump()
        ),
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

    return ClassifierService().delete_classifier_by_id(
        db=db, classifier_id=classifier_id
    )


@router.post(
    "/project/{proj_id}/dataset-statistics",
    response_model=ClassifierDatasetStatistics,
    summary="Returns statistics of the dataset that would be created with these parameters",
)
def compute_dataset_statistics(
    *,
    proj_id: int,
    request: ClassifierDatasetStatisticsRequest,
    db: Session = Depends(get_db_session),
    authz_user: AuthzUser = Depends(),
) -> ClassifierDatasetStatistics:
    authz_user.assert_in_project(proj_id)

    tcs = ClassifierService().get_model_service(request.model)
    return tcs.compute_dataset_statistics(
        db=db,
        project_id=proj_id,
        tag_ids=request.tag_ids,
        user_ids=request.user_ids,
        class_ids=request.class_ids,
        merge_children_into_parent=request.merge_children_into_parent,
        base_model_name=request.base_model_name,
    )
