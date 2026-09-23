from enum import StrEnum
from typing import Any, Literal, Union

from loguru import logger
from pydantic import BaseModel, create_model

from core.annotation.bbox_annotation_dto import BBoxAnnotationRead
from core.annotation.sentence_annotation_dto import SentenceAnnotationRead
from core.annotation.span_annotation_dto import (
    SpanAnnotationDeleted,
    SpanAnnotationRead,
)
from core.annotation.span_group_dto import SpanGroupRead
from core.auth.api_key_dto import ApiKeyRead
from core.code.code_dto import CodeRead
from core.doc.folder_dto import FolderRead
from core.doc.source_document_dto import SourceDocumentRead
from core.memo.memo_dto import MemoRead
from core.metadata.project_metadata_dto import ProjectMetadataRead
from core.metadata.source_document_metadata_dto import SourceDocumentMetadataRead
from core.project.project_dto import ProjectRead
from core.tag.tag_dto import SdocTagLinks, TagRead
from core.user.user_dto import UserRead
from modules.classifier.classifier_dto import ClassifierRead
from modules.concept_over_time_analysis.cota_dto import COTARead
from modules.ml.tag_recommendation.tag_recommendation_dto import (
    TagRecommendationLinkRead,
)
from modules.perspectives.aspect_dto import AspectRead
from modules.search_view.search_view_dto import SearchViewReadUnion
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

    MEMO_CREATED = "MEMO_CREATED"
    MEMO_UPDATED = "MEMO_UPDATED"
    MEMO_DELETED = "MEMO_DELETED"
    MEMO_UPDATED_BATCH = "MEMO_UPDATED_BATCH"

    SDOC_UPDATED = "SDOC_UPDATED"
    SDOC_DELETED = "SDOC_DELETED"
    SDOC_TAGS_UPDATED = "SDOC_TAGS_UPDATED"

    SPAN_ANNOTATION_CREATED = "SPAN_ANNOTATION_CREATED"
    SPAN_ANNOTATION_UPDATED = "SPAN_ANNOTATION_UPDATED"
    SPAN_ANNOTATION_DELETED = "SPAN_ANNOTATION_DELETED"
    SPAN_ANNOTATION_CREATED_BATCH = "SPAN_ANNOTATION_CREATED_BATCH"
    SPAN_ANNOTATION_UPDATED_BATCH = "SPAN_ANNOTATION_UPDATED_BATCH"
    SPAN_ANNOTATION_DELETED_BATCH = "SPAN_ANNOTATION_DELETED_BATCH"

    BBOX_ANNOTATION_CREATED = "BBOX_ANNOTATION_CREATED"
    BBOX_ANNOTATION_UPDATED = "BBOX_ANNOTATION_UPDATED"
    BBOX_ANNOTATION_DELETED = "BBOX_ANNOTATION_DELETED"
    BBOX_ANNOTATION_UPDATED_BATCH = "BBOX_ANNOTATION_UPDATED_BATCH"
    BBOX_ANNOTATION_DELETED_BATCH = "BBOX_ANNOTATION_DELETED_BATCH"

    SENTENCE_ANNOTATION_CREATED = "SENTENCE_ANNOTATION_CREATED"
    SENTENCE_ANNOTATION_UPDATED = "SENTENCE_ANNOTATION_UPDATED"
    SENTENCE_ANNOTATION_DELETED = "SENTENCE_ANNOTATION_DELETED"
    SENTENCE_ANNOTATION_CREATED_BATCH = "SENTENCE_ANNOTATION_CREATED_BATCH"
    SENTENCE_ANNOTATION_UPDATED_BATCH = "SENTENCE_ANNOTATION_UPDATED_BATCH"
    SENTENCE_ANNOTATION_DELETED_BATCH = "SENTENCE_ANNOTATION_DELETED_BATCH"

    FOLDER_CREATED = "FOLDER_CREATED"
    FOLDER_UPDATED = "FOLDER_UPDATED"
    FOLDER_DELETED = "FOLDER_DELETED"
    FOLDER_UPDATED_BATCH = "FOLDER_UPDATED_BATCH"

    PROJECT_METADATA_CREATED = "PROJECT_METADATA_CREATED"
    PROJECT_METADATA_UPDATED = "PROJECT_METADATA_UPDATED"
    PROJECT_METADATA_DELETED = "PROJECT_METADATA_DELETED"

    SDOC_METADATA_UPDATED = "SDOC_METADATA_UPDATED"
    SDOC_METADATA_DELETED = "SDOC_METADATA_DELETED"
    SDOC_METADATA_UPDATED_BATCH = "SDOC_METADATA_UPDATED_BATCH"

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

    USER_UPDATED = "USER_UPDATED"
    USER_DELETED = "USER_DELETED"

    API_KEY_CREATED = "API_KEY_CREATED"
    API_KEY_DELETED = "API_KEY_DELETED"

    TAG_RECOMMENDATION_REVIEWED_BATCH = "TAG_RECOMMENDATION_REVIEWED_BATCH"

    SEARCH_VIEW_CREATED = "SEARCH_VIEW_CREATED"
    SEARCH_VIEW_UPDATED = "SEARCH_VIEW_UPDATED"
    SEARCH_VIEW_DELETED = "SEARCH_VIEW_DELETED"
    SEARCH_VIEW_UPDATED_BATCH = "SEARCH_VIEW_UPDATED_BATCH"

    JOB_UPDATED = "JOB_UPDATED"


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
# Payloads are pydantic field types: plain classes, `list[...]` generic aliases,
# or `Union[...]` — hence the wide `object` value type.
_DATS_EVENT_PAYLOADS: dict[DATSEvent, object] = {
    DATSEvent.PROJECT_CREATED: ProjectRead,
    DATSEvent.PROJECT_UPDATED: ProjectRead,
    DATSEvent.PROJECT_DELETED: ProjectRead,
    DATSEvent.CODE_CREATED: CodeRead,
    DATSEvent.CODE_UPDATED: CodeRead,
    DATSEvent.CODE_DELETED: CodeRead,
    DATSEvent.TAG_CREATED: TagRead,
    DATSEvent.TAG_UPDATED: TagRead,
    DATSEvent.TAG_DELETED: TagRead,
    DATSEvent.MEMO_CREATED: MemoRead,
    DATSEvent.MEMO_UPDATED: MemoRead,
    DATSEvent.MEMO_DELETED: MemoRead,
    DATSEvent.MEMO_UPDATED_BATCH: list[MemoRead],
    DATSEvent.SDOC_UPDATED: SourceDocumentRead,
    DATSEvent.SDOC_DELETED: SourceDocumentRead,
    DATSEvent.SDOC_TAGS_UPDATED: SdocTagLinks,
    DATSEvent.SPAN_ANNOTATION_CREATED: SpanAnnotationRead,
    DATSEvent.SPAN_ANNOTATION_UPDATED: SpanAnnotationRead,
    DATSEvent.SPAN_ANNOTATION_DELETED: SpanAnnotationDeleted,
    DATSEvent.SPAN_ANNOTATION_CREATED_BATCH: list[SpanAnnotationRead],
    DATSEvent.SPAN_ANNOTATION_UPDATED_BATCH: list[SpanAnnotationRead],
    DATSEvent.SPAN_ANNOTATION_DELETED_BATCH: list[SpanAnnotationDeleted],
    DATSEvent.BBOX_ANNOTATION_CREATED: BBoxAnnotationRead,
    DATSEvent.BBOX_ANNOTATION_UPDATED: BBoxAnnotationRead,
    DATSEvent.BBOX_ANNOTATION_DELETED: BBoxAnnotationRead,
    DATSEvent.BBOX_ANNOTATION_UPDATED_BATCH: list[BBoxAnnotationRead],
    DATSEvent.BBOX_ANNOTATION_DELETED_BATCH: list[BBoxAnnotationRead],
    DATSEvent.SENTENCE_ANNOTATION_CREATED: SentenceAnnotationRead,
    DATSEvent.SENTENCE_ANNOTATION_UPDATED: SentenceAnnotationRead,
    DATSEvent.SENTENCE_ANNOTATION_DELETED: SentenceAnnotationRead,
    DATSEvent.SENTENCE_ANNOTATION_CREATED_BATCH: list[SentenceAnnotationRead],
    DATSEvent.SENTENCE_ANNOTATION_UPDATED_BATCH: list[SentenceAnnotationRead],
    DATSEvent.SENTENCE_ANNOTATION_DELETED_BATCH: list[SentenceAnnotationRead],
    DATSEvent.FOLDER_CREATED: FolderRead,
    DATSEvent.FOLDER_UPDATED: FolderRead,
    DATSEvent.FOLDER_DELETED: FolderRead,
    DATSEvent.FOLDER_UPDATED_BATCH: list[FolderRead],
    DATSEvent.PROJECT_METADATA_CREATED: ProjectMetadataRead,
    DATSEvent.PROJECT_METADATA_UPDATED: ProjectMetadataRead,
    DATSEvent.PROJECT_METADATA_DELETED: ProjectMetadataRead,
    DATSEvent.SDOC_METADATA_UPDATED: SourceDocumentMetadataRead,
    DATSEvent.SDOC_METADATA_DELETED: SourceDocumentMetadataRead,
    DATSEvent.SDOC_METADATA_UPDATED_BATCH: list[SourceDocumentMetadataRead],
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
    DATSEvent.USER_UPDATED: UserRead,
    DATSEvent.USER_DELETED: UserRead,
    DATSEvent.API_KEY_CREATED: ApiKeyRead,
    DATSEvent.API_KEY_DELETED: ApiKeyRead,
    DATSEvent.TAG_RECOMMENDATION_REVIEWED_BATCH: list[TagRecommendationLinkRead],
    DATSEvent.SEARCH_VIEW_CREATED: SearchViewReadUnion,
    DATSEvent.SEARCH_VIEW_UPDATED: SearchViewReadUnion,
    DATSEvent.SEARCH_VIEW_DELETED: SearchViewReadUnion,
    DATSEvent.SEARCH_VIEW_UPDATED_BATCH: list[SearchViewReadUnion],
    # NOTE: DATSEvent.JOB_UPDATED is intentionally absent — its payload is a
    # per-JobType union of concrete JobRead models, built lazily by
    # build_job_event_models() once all jobs are registered.
}


def _event_model_name(event_type: DATSEvent) -> str:
    # SPAN_ANNOTATION_CREATED -> SpanAnnotationCreatedEvent
    return "".join(part.capitalize() for part in event_type.value.split("_")) + "Event"


def _make_event_model(
    event_type: DATSEvent, payload_type: object
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

# Per-JobType concrete JobRead models, populated by build_job_event_models().
# Used by job_events.publish_job_update to build a payload that is a member of
# the JOB_UPDATED union (a parametrized generic alias instance is not).
# Value type is `type[JobRead]` (JobRead imported lazily to avoid cycles).
JOB_TYPE_TO_JOB_READ_MODEL: dict[object, Any] = {}


def build_job_event_models() -> None:
    """Build and register the JOB_UPDATED event model.

    The payload is a Union over one concrete JobRead model per registered
    JobType (mirroring the per-type models generated for the REST endpoints in
    job_endpoint.py). Must be called once at startup AFTER all jobs are
    registered (i.e. after `import_by_suffix("_job.py")`) and BEFORE
    websocket_dto.py is first imported, since that module builds its
    WebSocketEvent union from DATS_EVENT_TO_MODEL at import time.

    Idempotent: subsequent calls are no-ops.
    """
    if DATSEvent.JOB_UPDATED in DATS_EVENT_TO_MODEL:
        return

    # Lazy imports: this module must not import JobService / job_dto at module
    # level (import cycle: dats_event -> classifier_dto -> job_dto).
    from systems.job_system.job_dto import JobRead
    from systems.job_system.job_service import JobService

    job_read_models: list[type[BaseModel]] = []
    for job_type, registered_job in JobService().job_registry.items():
        job_name = "".join([x.capitalize() for x in job_type.split("_")])
        model = create_model(
            f"{job_name}JobRead",
            __base__=JobRead[
                registered_job["input_type"], registered_job["output_type"]
            ],
        )
        job_read_models.append(model)
        JOB_TYPE_TO_JOB_READ_MODEL[job_type] = model

    if not job_read_models:
        logger.warning(
            "build_job_event_models: no jobs registered, skipping JOB_UPDATED event model"
        )
        return

    payload_union = Union[tuple(job_read_models)]
    event_model = _make_event_model(DATSEvent.JOB_UPDATED, payload_union)
    globals()[_event_model_name(DATSEvent.JOB_UPDATED)] = event_model
    DATS_EVENT_TO_MODEL[DATSEvent.JOB_UPDATED] = event_model
