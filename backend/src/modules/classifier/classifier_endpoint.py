from fastapi import Depends

from common.dats_event import DATSEvent
from common.dependencies import DBSession
from common.project_router import project_router
from config import conf
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
from systems.websocket_system.websocket_dependency import WebsocketEmitter

router = project_router("/classifiers", tags=["classifier"])


# --- read operations


@router.get(
    "/info",
    response_model=ClassifierInfo,
    summary="Returns classifier models, thresholds, and training defaults",
)
def get_info(*, project_id: int) -> ClassifierInfo:
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
    "",
    response_model=list[ClassifierRead],
    summary="Returns all Classifiers of the Project",
)
def get_by_project(
    *,
    db: DBSession,
    project_id: int,
) -> list[ClassifierRead]:
    db_objs = crud_classifier.read_by_project(db=db, project_id=project_id)
    return [ClassifierRead.model_validate(db_obj) for db_obj in db_objs]


# --- update operations


@router.patch(
    "/{classifier_id}",
    response_model=ClassifierRead,
    summary="Updates the Classifier with the given ID.",
)
def update_by_id(
    *,
    db: DBSession,
    project_id: int,
    classifier_id: int,
    classifier: ClassifierUpdate,
    ws: WebsocketEmitter = Depends(),
) -> ClassifierRead:
    db_obj = crud_classifier.update(
        db=db, project_id=project_id, id=classifier_id, update_dto=classifier
    )
    result = ClassifierRead.model_validate(db_obj)
    ws.emit_to_project(DATSEvent.CLASSIFIER_UPDATED, result, project_id=project_id)
    return result


# --- delete operations


@router.delete(
    "/{classifier_id}",
    response_model=ClassifierRead,
    summary="Deletes the Classifier with the given ID.",
)
def delete_by_id(
    *,
    db: DBSession,
    project_id: int,
    classifier_id: int,
    ws: WebsocketEmitter = Depends(),
) -> ClassifierRead:
    result = ClassifierService().delete_classifier_by_id(
        db=db, project_id=project_id, classifier_id=classifier_id
    )
    ws.emit_to_project(DATSEvent.CLASSIFIER_DELETED, result, project_id=project_id)
    return result


# --- other operations


@router.post(
    "/dataset-statistics",
    response_model=ClassifierDatasetStatistics,
    summary="Returns statistics of the dataset that would be created with these parameters",
)
def compute_dataset_statistics(
    *,
    db: DBSession,
    project_id: int,
    request: ClassifierDatasetStatisticsRequest,
) -> ClassifierDatasetStatistics:
    tcs = ClassifierService().get_model_service(model_type=request.model)
    return tcs.compute_dataset_statistics(
        db=db,
        project_id=project_id,
        tag_ids=request.tag_ids,
        user_ids=request.user_ids,
        class_ids=request.class_ids,
        merge_children_into_parent=request.merge_children_into_parent,
        base_model_name=request.base_model_name,
    )
