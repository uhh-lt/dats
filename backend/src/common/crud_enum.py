from enum import Enum

from core.annotation.annotation_document_crud import crud_adoc
from core.annotation.bbox_annotation_crud import crud_bbox_anno
from core.annotation.sentence_annotation_crud import crud_sentence_anno
from core.annotation.span_annotation_crud import crud_span_anno
from core.annotation.span_group_crud import crud_span_group
from core.annotation.span_text_crud import crud_span_text
from core.auth.refresh_token_crud import crud_refresh_token
from core.code.code_crud import crud_code
from core.doc.folder_crud import crud_folder
from core.doc.source_document_crud import crud_sdoc
from core.doc.source_document_data_crud import crud_sdoc_data
from core.memo.memo_crud import crud_memo
from core.memo.object_handle_crud import crud_object_handle
from core.metadata.project_metadata_crud import crud_project_meta
from core.metadata.source_document_metadata_crud import crud_sdoc_meta
from core.project.project_crud import crud_project
from core.tag.tag_crud import crud_tag
from core.user.user_crud import crud_user
from modules.classifier.classifier_crud import crud_classifier
from modules.concept_over_time_analysis.cota_crud import (
    crud_cota,
)
from modules.ml.source_document_job_status_crud import crud_sdoc_job_status
from modules.ml.tag_recommendation.tag_recommendation_crud import (
    crud_tag_recommendation_link,
)
from modules.perspectives.aspect_crud import crud_aspect
from modules.perspectives.cluster_crud import crud_cluster
from modules.perspectives.document_aspect_crud import crud_document_aspect
from modules.timeline_analysis.timeline_analysis_crud import (
    crud_timeline_analysis,
)
from modules.whiteboard.whiteboard_crud import crud_whiteboard
from modules.word_frequency.word_frequency_crud import crud_word_frequency


class Crud(Enum):
    ASPECT = crud_aspect
    ANNOTATION_DOCUMENT = crud_adoc
    BBOX_ANNOTATION = crud_bbox_anno
    CLASSIFIER = crud_classifier
    CLUSTER = crud_cluster
    CODE = crud_code
    COTA_ANALYSIS = crud_cota
    DOCUMENT_ASPECT = crud_document_aspect
    TAG = crud_tag
    TAG_RECOMMENDATION = crud_tag_recommendation_link
    FOLDER = crud_folder
    MEMO = crud_memo
    OBJECT_HANDLE = crud_object_handle
    PROJECT = crud_project
    PROJECT_METADATA = crud_project_meta
    REFRESH_TOKEN = crud_refresh_token
    SENTENCE_ANNOTATION = crud_sentence_anno
    SOURCE_DOCUMENT_DATA = crud_sdoc_data
    SOURCE_DOCUMENT_JOB_STATUS = crud_sdoc_job_status
    SOURCE_DOCUMENT_METADATA = crud_sdoc_meta
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
