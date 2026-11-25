from enum import Enum

from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_group_crud import crud_span_group
from core.annotation.span_text_crud import crud_span_text
from core.artefacts.word_frequencies.word_frequency_crud import crud_word_frequency
from core.auth.refresh_token_crud import crud_refresh_token
from core.code.code_crud import crud_code
from core.doc.source_document_crud import crud_sdoc
from core.memo.memo_crud import crud_memo
from core.memo.memo_enum import AttachedObjectType
from core.memo.object_handle_crud import crud_object_handle
from core.project.project_crud import crud_project
from core.prompt.prompt_crud import crud_prompt
from core.prompt.prompt_version_crud import (
    crud_prompt_version,
)
from core.tag.tag_crud import crud_tag
from core.user.user_crud import crud_user
from modules.classifier.classifier_crud import crud_classifier
from modules.concept_over_time_analysis.cota_crud import (
    crud_cota,
)
from modules.experiment.experiment_crud import crud_experiment
from modules.experiment.experiment_run_crud import crud_experiment_run
from modules.perspectives.aspect_crud import crud_aspect
from modules.perspectives.cluster_crud import crud_cluster
from modules.perspectives.document_aspect_crud import crud_document_aspect
from modules.tag_recommendation.tag_recommendation_crud import (
    crud_tag_recommendation_link,
)
from modules.timeline_analysis.timeline_analysis_crud import (
    crud_timeline_analysis,
)
from modules.whiteboard.whiteboard_crud import crud_whiteboard


class Crud(Enum):
    ASPECT = crud_aspect
    BBOX_ANNOTATION = crud_bbox_anno
    CLASSIFIER = crud_classifier
    CLUSTER = crud_cluster
    CODE = crud_code
    COTA_ANALYSIS = crud_cota
    DOCUMENT_ASPECT = crud_document_aspect
    EXPERIMENT = crud_experiment
    EXPERIMENT_RUN = crud_experiment_run
    TAG = crud_tag
    TAG_RECOMMENDATION = crud_tag_recommendation_link
    MEMO = crud_memo
    OBJECT_HANDLE = crud_object_handle
    PROJECT = crud_project
    PROMPT = crud_prompt
    PROMPT_VERSION = crud_prompt_version
    REFRESH_TOKEN = crud_refresh_token
    SENTENCE_ANNOTATION = crud_sentence_anno
    SOURCE_DOCUMENT = crud_sdoc
    SPAN_ANNOTATION = crud_span_anno
    SPAN_GROUP = crud_span_group
    SPAN_TEXT = crud_span_text
    TIMELINE_ANALYSIS = crud_timeline_analysis
    USER = crud_user
    WHITEBOARD = crud_whiteboard
    WORD_FREQUENCY = crud_word_frequency


class MemoCrud(Enum):
    PROJECT = crud_project
    SOURCE_DOCUMENT = crud_sdoc
    TAG = crud_tag
    CODE = crud_code
    SPAN_ANNOTATION = crud_span_anno
    BBOX_ANNOTATION = crud_bbox_anno
    SENTENCE_ANNOTATION = crud_sentence_anno
    SPAN_GROUP = crud_span_group


attached_object_type_to_memo_crud: dict[AttachedObjectType, MemoCrud] = {
    AttachedObjectType.project: MemoCrud.PROJECT,
    AttachedObjectType.source_document: MemoCrud.SOURCE_DOCUMENT,
    AttachedObjectType.tag: MemoCrud.TAG,
    AttachedObjectType.code: MemoCrud.CODE,
    AttachedObjectType.span_annotation: MemoCrud.SPAN_ANNOTATION,
    AttachedObjectType.bbox_annotation: MemoCrud.BBOX_ANNOTATION,
    AttachedObjectType.sentence_annotation: MemoCrud.SENTENCE_ANNOTATION,
    AttachedObjectType.span_group: MemoCrud.SPAN_GROUP,
}

attached_object_type_to_crud: dict[AttachedObjectType, Crud] = {
    AttachedObjectType.project: Crud.PROJECT,
    AttachedObjectType.source_document: Crud.SOURCE_DOCUMENT,
    AttachedObjectType.tag: Crud.TAG,
    AttachedObjectType.code: Crud.CODE,
    AttachedObjectType.span_annotation: Crud.SPAN_ANNOTATION,
    AttachedObjectType.bbox_annotation: Crud.BBOX_ANNOTATION,
    AttachedObjectType.sentence_annotation: Crud.SENTENCE_ANNOTATION,
    AttachedObjectType.span_group: Crud.SPAN_GROUP,
}
