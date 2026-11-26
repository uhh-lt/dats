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
from core.memo.memo_enum import AttachedObjectType
from core.project.project_crud import crud_project
from core.tag.tag_crud import crud_tag
from core.user.user_crud import crud_user
from modules.classifier.classifier_crud import crud_classifier
from modules.perspectives.aspect_crud import crud_aspect


class Crud(Enum):
    ASPECT = crud_aspect
    BBOX_ANNOTATION = crud_bbox_anno
    CLASSIFIER = crud_classifier
    CODE = crud_code
    TAG = crud_tag
    PROJECT = crud_project
    REFRESH_TOKEN = crud_refresh_token
    SENTENCE_ANNOTATION = crud_sentence_anno
    SOURCE_DOCUMENT = crud_sdoc
    SPAN_ANNOTATION = crud_span_anno
    SPAN_GROUP = crud_span_group
    SPAN_TEXT = crud_span_text
    USER = crud_user
    WORD_FREQUENCY = crud_word_frequency


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
