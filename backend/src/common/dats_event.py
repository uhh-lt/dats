from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, create_model

from core.annotation.bbox_annotation_dto import BBoxAnnotationRead
from core.annotation.sentence_annotation_dto import SentenceAnnotationRead
from core.annotation.span_annotation_dto import (
    SpanAnnotationDeleted,
    SpanAnnotationRead,
)
from core.annotation.span_group_dto import SpanGroupRead
from core.code.code_dto import CodeRead
from core.doc.folder_dto import FolderRead
from core.doc.source_document_dto import SourceDocumentRead
from core.memo.memo_dto import MemoRead
from core.metadata.project_metadata_dto import ProjectMetadataRead
from core.metadata.source_document_metadata_dto import SourceDocumentMetadataRead
from core.project.project_dto import ProjectRead
from core.tag.tag_dto import TagRead
from core.user.user_dto import UserRead
from modules.classifier.classifier_dto import ClassifierRead
from modules.concept_over_time_analysis.cota_dto import COTARead
from modules.perspectives.aspect_dto import AspectRead
from modules.timeline_analysis.timeline_analysis_dto import TimelineAnalysisRead
from modules.whiteboard.whiteboard_dto import WhiteboardRead


class DATSEvent(StrEnum):
    PROJECT_CREATED = "PROJECT_CREATED"
    PROJECT_UPDATED = "PROJECT_UPDATED"
    PROJECT_DELETED = "PROJECT_DELETED"

    CODE_CREATED = "CODE_CREATED"
    CODE_UPDATED = "CODE_UPDATED"
    CODE_DELETED = "CODE_DELETED"

    TAG_CREATED = "TAG_CREATED"
    TAG_UPDATED = "TAG_UPDATED"
    TAG_DELETED = "TAG_DELETED"

    MEMO_UPDATED = "MEMO_UPDATED"
    MEMO_DELETED = "MEMO_DELETED"

    SDOC_UPDATED = "SDOC_UPDATED"
    SDOC_DELETED = "SDOC_DELETED"

    SPAN_ANNOTATION_CREATED = "SPAN_ANNOTATION_CREATED"
    SPAN_ANNOTATION_UPDATED = "SPAN_ANNOTATION_UPDATED"
    SPAN_ANNOTATION_DELETED = "SPAN_ANNOTATION_DELETED"

    BBOX_ANNOTATION_CREATED = "BBOX_ANNOTATION_CREATED"
    BBOX_ANNOTATION_UPDATED = "BBOX_ANNOTATION_UPDATED"
    BBOX_ANNOTATION_DELETED = "BBOX_ANNOTATION_DELETED"

    SENTENCE_ANNOTATION_CREATED = "SENTENCE_ANNOTATION_CREATED"
    SENTENCE_ANNOTATION_UPDATED = "SENTENCE_ANNOTATION_UPDATED"
    SENTENCE_ANNOTATION_DELETED = "SENTENCE_ANNOTATION_DELETED"

    FOLDER_CREATED = "FOLDER_CREATED"
    FOLDER_UPDATED = "FOLDER_UPDATED"
    FOLDER_DELETED = "FOLDER_DELETED"

    PROJECT_METADATA_CREATED = "PROJECT_METADATA_CREATED"
    PROJECT_METADATA_UPDATED = "PROJECT_METADATA_UPDATED"
    PROJECT_METADATA_DELETED = "PROJECT_METADATA_DELETED"

    SDOC_METADATA_UPDATED = "SDOC_METADATA_UPDATED"
    SDOC_METADATA_DELETED = "SDOC_METADATA_DELETED"

    SPAN_GROUP_CREATED = "SPAN_GROUP_CREATED"
    SPAN_GROUP_UPDATED = "SPAN_GROUP_UPDATED"
    SPAN_GROUP_DELETED = "SPAN_GROUP_DELETED"

    WHITEBOARD_CREATED = "WHITEBOARD_CREATED"
    WHITEBOARD_UPDATED = "WHITEBOARD_UPDATED"
    WHITEBOARD_DELETED = "WHITEBOARD_DELETED"

    TIMELINE_ANALYSIS_CREATED = "TIMELINE_ANALYSIS_CREATED"
    TIMELINE_ANALYSIS_UPDATED = "TIMELINE_ANALYSIS_UPDATED"
    TIMELINE_ANALYSIS_DELETED = "TIMELINE_ANALYSIS_DELETED"

    COTA_CREATED = "COTA_CREATED"
    COTA_UPDATED = "COTA_UPDATED"
    COTA_DELETED = "COTA_DELETED"

    ASPECT_CREATED = "ASPECT_CREATED"
    ASPECT_UPDATED = "ASPECT_UPDATED"
    ASPECT_DELETED = "ASPECT_DELETED"

    CLASSIFIER_UPDATED = "CLASSIFIER_UPDATED"
    CLASSIFIER_DELETED = "CLASSIFIER_DELETED"

    PROJECT_USER_ADDED = "PROJECT_USER_ADDED"
    PROJECT_USER_REMOVED = "PROJECT_USER_REMOVED"


class DATSEventBase(BaseModel):
    """Common base for all DATS domain events.

    Subclasses narrow `type` to a single `Literal[DATSEvent.…]` (required for
    discriminated-union parsing) and `payload` to the concrete read DTO. This
    base itself is never a union member — it only provides statically typed
    access to `type` and `payload`.
    """

    type: DATSEvent
    payload: BaseModel


# Single source of truth: event type -> payload type. The event classes are
# generated from this table (see below), so adding an event is one enum member
# plus one line here.
_DATS_EVENT_PAYLOADS: dict[DATSEvent, type] = {
    DATSEvent.PROJECT_CREATED: ProjectRead,
    DATSEvent.PROJECT_UPDATED: ProjectRead,
    DATSEvent.PROJECT_DELETED: ProjectRead,
    DATSEvent.CODE_CREATED: CodeRead,
    DATSEvent.CODE_UPDATED: CodeRead,
    DATSEvent.CODE_DELETED: CodeRead,
    DATSEvent.TAG_CREATED: TagRead,
    DATSEvent.TAG_UPDATED: TagRead,
    DATSEvent.TAG_DELETED: TagRead,
    DATSEvent.MEMO_UPDATED: MemoRead,
    DATSEvent.MEMO_DELETED: MemoRead,
    DATSEvent.SDOC_UPDATED: SourceDocumentRead,
    DATSEvent.SDOC_DELETED: SourceDocumentRead,
    DATSEvent.SPAN_ANNOTATION_CREATED: SpanAnnotationRead,
    DATSEvent.SPAN_ANNOTATION_UPDATED: SpanAnnotationRead,
    DATSEvent.SPAN_ANNOTATION_DELETED: SpanAnnotationDeleted,
    DATSEvent.BBOX_ANNOTATION_CREATED: BBoxAnnotationRead,
    DATSEvent.BBOX_ANNOTATION_UPDATED: BBoxAnnotationRead,
    DATSEvent.BBOX_ANNOTATION_DELETED: BBoxAnnotationRead,
    DATSEvent.SENTENCE_ANNOTATION_CREATED: SentenceAnnotationRead,
    DATSEvent.SENTENCE_ANNOTATION_UPDATED: SentenceAnnotationRead,
    DATSEvent.SENTENCE_ANNOTATION_DELETED: SentenceAnnotationRead,
    DATSEvent.FOLDER_CREATED: FolderRead,
    DATSEvent.FOLDER_UPDATED: FolderRead,
    DATSEvent.FOLDER_DELETED: FolderRead,
    DATSEvent.PROJECT_METADATA_CREATED: ProjectMetadataRead,
    DATSEvent.PROJECT_METADATA_UPDATED: ProjectMetadataRead,
    DATSEvent.PROJECT_METADATA_DELETED: ProjectMetadataRead,
    DATSEvent.SDOC_METADATA_UPDATED: SourceDocumentMetadataRead,
    DATSEvent.SDOC_METADATA_DELETED: SourceDocumentMetadataRead,
    DATSEvent.SPAN_GROUP_CREATED: SpanGroupRead,
    DATSEvent.SPAN_GROUP_UPDATED: SpanGroupRead,
    DATSEvent.SPAN_GROUP_DELETED: SpanGroupRead,
    DATSEvent.WHITEBOARD_CREATED: WhiteboardRead,
    DATSEvent.WHITEBOARD_UPDATED: WhiteboardRead,
    DATSEvent.WHITEBOARD_DELETED: WhiteboardRead,
    DATSEvent.TIMELINE_ANALYSIS_CREATED: TimelineAnalysisRead,
    DATSEvent.TIMELINE_ANALYSIS_UPDATED: TimelineAnalysisRead,
    DATSEvent.TIMELINE_ANALYSIS_DELETED: TimelineAnalysisRead,
    DATSEvent.COTA_CREATED: COTARead,
    DATSEvent.COTA_UPDATED: COTARead,
    DATSEvent.COTA_DELETED: COTARead,
    DATSEvent.ASPECT_CREATED: AspectRead,
    DATSEvent.ASPECT_UPDATED: AspectRead,
    DATSEvent.ASPECT_DELETED: AspectRead,
    DATSEvent.CLASSIFIER_UPDATED: ClassifierRead,
    DATSEvent.CLASSIFIER_DELETED: ClassifierRead,
    DATSEvent.PROJECT_USER_ADDED: UserRead,
    DATSEvent.PROJECT_USER_REMOVED: UserRead,
}


def _event_model_name(event_type: DATSEvent) -> str:
    # SPAN_ANNOTATION_CREATED -> SpanAnnotationCreatedEvent
    return "".join(part.capitalize() for part in event_type.value.split("_")) + "Event"


def _make_event_model(
    event_type: DATSEvent, payload_type: type[BaseModel]
) -> type[DATSEventBase]:
    return create_model(
        _event_model_name(event_type),
        __base__=DATSEventBase,
        type=(Literal[event_type], event_type),
        payload=payload_type,
    )


# Generate one module-level pydantic model per event (ProjectCreatedEvent, ...) so they
# can be imported by name.
globals().update(
    {
        _event_model_name(et): _make_event_model(et, pt)
        for et, pt in _DATS_EVENT_PAYLOADS.items()
    }
)

DATS_EVENT_TO_MODEL: dict[DATSEvent, type[DATSEventBase]] = {
    et: globals()[_event_model_name(et)] for et in _DATS_EVENT_PAYLOADS
}
