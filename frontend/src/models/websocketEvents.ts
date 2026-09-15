/* eslint-disable */
// GENERATED FILE — do not edit. Regenerate with `just update-api`.
// Derived from the backend's websocket sync events (OpenAPI `webhooks`).

import type { AspectCreatedEvent } from "./AspectCreatedEvent";
import type { AspectDeletedEvent } from "./AspectDeletedEvent";
import type { AspectUpdatedEvent } from "./AspectUpdatedEvent";
import type { BboxAnnotationCreatedEvent } from "./BboxAnnotationCreatedEvent";
import type { BboxAnnotationDeletedEvent } from "./BboxAnnotationDeletedEvent";
import type { BboxAnnotationUpdatedEvent } from "./BboxAnnotationUpdatedEvent";
import type { ClassifierDeletedEvent } from "./ClassifierDeletedEvent";
import type { ClassifierUpdatedEvent } from "./ClassifierUpdatedEvent";
import type { CodeCreatedEvent } from "./CodeCreatedEvent";
import type { CodeDeletedEvent } from "./CodeDeletedEvent";
import type { CodeUpdatedEvent } from "./CodeUpdatedEvent";
import type { CotaCreatedEvent } from "./CotaCreatedEvent";
import type { CotaDeletedEvent } from "./CotaDeletedEvent";
import type { CotaUpdatedEvent } from "./CotaUpdatedEvent";
import type { FolderCreatedEvent } from "./FolderCreatedEvent";
import type { FolderDeletedEvent } from "./FolderDeletedEvent";
import type { FolderUpdatedEvent } from "./FolderUpdatedEvent";
import type { MemoDeletedEvent } from "./MemoDeletedEvent";
import type { MemoUpdatedEvent } from "./MemoUpdatedEvent";
import type { ProjectCreatedEvent } from "./ProjectCreatedEvent";
import type { ProjectDeletedEvent } from "./ProjectDeletedEvent";
import type { ProjectMetadataCreatedEvent } from "./ProjectMetadataCreatedEvent";
import type { ProjectMetadataDeletedEvent } from "./ProjectMetadataDeletedEvent";
import type { ProjectMetadataUpdatedEvent } from "./ProjectMetadataUpdatedEvent";
import type { ProjectUpdatedEvent } from "./ProjectUpdatedEvent";
import type { ProjectUserAddedEvent } from "./ProjectUserAddedEvent";
import type { ProjectUserRemovedEvent } from "./ProjectUserRemovedEvent";
import type { SdocDeletedEvent } from "./SdocDeletedEvent";
import type { SdocMetadataDeletedEvent } from "./SdocMetadataDeletedEvent";
import type { SdocMetadataUpdatedEvent } from "./SdocMetadataUpdatedEvent";
import type { SdocUpdatedEvent } from "./SdocUpdatedEvent";
import type { SentenceAnnotationCreatedEvent } from "./SentenceAnnotationCreatedEvent";
import type { SentenceAnnotationDeletedEvent } from "./SentenceAnnotationDeletedEvent";
import type { SentenceAnnotationUpdatedEvent } from "./SentenceAnnotationUpdatedEvent";
import type { SpanAnnotationCreatedEvent } from "./SpanAnnotationCreatedEvent";
import type { SpanAnnotationDeletedEvent } from "./SpanAnnotationDeletedEvent";
import type { SpanAnnotationUpdatedEvent } from "./SpanAnnotationUpdatedEvent";
import type { SpanGroupCreatedEvent } from "./SpanGroupCreatedEvent";
import type { SpanGroupDeletedEvent } from "./SpanGroupDeletedEvent";
import type { SpanGroupUpdatedEvent } from "./SpanGroupUpdatedEvent";
import type { TagCreatedEvent } from "./TagCreatedEvent";
import type { TagDeletedEvent } from "./TagDeletedEvent";
import type { TagUpdatedEvent } from "./TagUpdatedEvent";
import type { TimelineAnalysisCreatedEvent } from "./TimelineAnalysisCreatedEvent";
import type { TimelineAnalysisDeletedEvent } from "./TimelineAnalysisDeletedEvent";
import type { TimelineAnalysisUpdatedEvent } from "./TimelineAnalysisUpdatedEvent";
import type { WhiteboardCreatedEvent } from "./WhiteboardCreatedEvent";
import type { WhiteboardDeletedEvent } from "./WhiteboardDeletedEvent";
import type { WhiteboardUpdatedEvent } from "./WhiteboardUpdatedEvent";

/** Payload type for each websocket event type. */
export interface WebSocketEventMap {
  ASPECT_CREATED: AspectCreatedEvent["payload"];
  ASPECT_DELETED: AspectDeletedEvent["payload"];
  ASPECT_UPDATED: AspectUpdatedEvent["payload"];
  BBOX_ANNOTATION_CREATED: BboxAnnotationCreatedEvent["payload"];
  BBOX_ANNOTATION_DELETED: BboxAnnotationDeletedEvent["payload"];
  BBOX_ANNOTATION_UPDATED: BboxAnnotationUpdatedEvent["payload"];
  CLASSIFIER_DELETED: ClassifierDeletedEvent["payload"];
  CLASSIFIER_UPDATED: ClassifierUpdatedEvent["payload"];
  CODE_CREATED: CodeCreatedEvent["payload"];
  CODE_DELETED: CodeDeletedEvent["payload"];
  CODE_UPDATED: CodeUpdatedEvent["payload"];
  COTA_CREATED: CotaCreatedEvent["payload"];
  COTA_DELETED: CotaDeletedEvent["payload"];
  COTA_UPDATED: CotaUpdatedEvent["payload"];
  FOLDER_CREATED: FolderCreatedEvent["payload"];
  FOLDER_DELETED: FolderDeletedEvent["payload"];
  FOLDER_UPDATED: FolderUpdatedEvent["payload"];
  MEMO_DELETED: MemoDeletedEvent["payload"];
  MEMO_UPDATED: MemoUpdatedEvent["payload"];
  PROJECT_CREATED: ProjectCreatedEvent["payload"];
  PROJECT_DELETED: ProjectDeletedEvent["payload"];
  PROJECT_METADATA_CREATED: ProjectMetadataCreatedEvent["payload"];
  PROJECT_METADATA_DELETED: ProjectMetadataDeletedEvent["payload"];
  PROJECT_METADATA_UPDATED: ProjectMetadataUpdatedEvent["payload"];
  PROJECT_UPDATED: ProjectUpdatedEvent["payload"];
  PROJECT_USER_ADDED: ProjectUserAddedEvent["payload"];
  PROJECT_USER_REMOVED: ProjectUserRemovedEvent["payload"];
  SDOC_DELETED: SdocDeletedEvent["payload"];
  SDOC_METADATA_DELETED: SdocMetadataDeletedEvent["payload"];
  SDOC_METADATA_UPDATED: SdocMetadataUpdatedEvent["payload"];
  SDOC_UPDATED: SdocUpdatedEvent["payload"];
  SENTENCE_ANNOTATION_CREATED: SentenceAnnotationCreatedEvent["payload"];
  SENTENCE_ANNOTATION_DELETED: SentenceAnnotationDeletedEvent["payload"];
  SENTENCE_ANNOTATION_UPDATED: SentenceAnnotationUpdatedEvent["payload"];
  SPAN_ANNOTATION_CREATED: SpanAnnotationCreatedEvent["payload"];
  SPAN_ANNOTATION_DELETED: SpanAnnotationDeletedEvent["payload"];
  SPAN_ANNOTATION_UPDATED: SpanAnnotationUpdatedEvent["payload"];
  SPAN_GROUP_CREATED: SpanGroupCreatedEvent["payload"];
  SPAN_GROUP_DELETED: SpanGroupDeletedEvent["payload"];
  SPAN_GROUP_UPDATED: SpanGroupUpdatedEvent["payload"];
  TAG_CREATED: TagCreatedEvent["payload"];
  TAG_DELETED: TagDeletedEvent["payload"];
  TAG_UPDATED: TagUpdatedEvent["payload"];
  TIMELINE_ANALYSIS_CREATED: TimelineAnalysisCreatedEvent["payload"];
  TIMELINE_ANALYSIS_DELETED: TimelineAnalysisDeletedEvent["payload"];
  TIMELINE_ANALYSIS_UPDATED: TimelineAnalysisUpdatedEvent["payload"];
  WHITEBOARD_CREATED: WhiteboardCreatedEvent["payload"];
  WHITEBOARD_DELETED: WhiteboardDeletedEvent["payload"];
  WHITEBOARD_UPDATED: WhiteboardUpdatedEvent["payload"];
}

/** Discriminated union of all websocket events, keyed by `type`. */
export type WebSocketEvent =
  | (Omit<AspectCreatedEvent, "type"> & { type: "ASPECT_CREATED" })
  | (Omit<AspectDeletedEvent, "type"> & { type: "ASPECT_DELETED" })
  | (Omit<AspectUpdatedEvent, "type"> & { type: "ASPECT_UPDATED" })
  | (Omit<BboxAnnotationCreatedEvent, "type"> & { type: "BBOX_ANNOTATION_CREATED" })
  | (Omit<BboxAnnotationDeletedEvent, "type"> & { type: "BBOX_ANNOTATION_DELETED" })
  | (Omit<BboxAnnotationUpdatedEvent, "type"> & { type: "BBOX_ANNOTATION_UPDATED" })
  | (Omit<ClassifierDeletedEvent, "type"> & { type: "CLASSIFIER_DELETED" })
  | (Omit<ClassifierUpdatedEvent, "type"> & { type: "CLASSIFIER_UPDATED" })
  | (Omit<CodeCreatedEvent, "type"> & { type: "CODE_CREATED" })
  | (Omit<CodeDeletedEvent, "type"> & { type: "CODE_DELETED" })
  | (Omit<CodeUpdatedEvent, "type"> & { type: "CODE_UPDATED" })
  | (Omit<CotaCreatedEvent, "type"> & { type: "COTA_CREATED" })
  | (Omit<CotaDeletedEvent, "type"> & { type: "COTA_DELETED" })
  | (Omit<CotaUpdatedEvent, "type"> & { type: "COTA_UPDATED" })
  | (Omit<FolderCreatedEvent, "type"> & { type: "FOLDER_CREATED" })
  | (Omit<FolderDeletedEvent, "type"> & { type: "FOLDER_DELETED" })
  | (Omit<FolderUpdatedEvent, "type"> & { type: "FOLDER_UPDATED" })
  | (Omit<MemoDeletedEvent, "type"> & { type: "MEMO_DELETED" })
  | (Omit<MemoUpdatedEvent, "type"> & { type: "MEMO_UPDATED" })
  | (Omit<ProjectCreatedEvent, "type"> & { type: "PROJECT_CREATED" })
  | (Omit<ProjectDeletedEvent, "type"> & { type: "PROJECT_DELETED" })
  | (Omit<ProjectMetadataCreatedEvent, "type"> & { type: "PROJECT_METADATA_CREATED" })
  | (Omit<ProjectMetadataDeletedEvent, "type"> & { type: "PROJECT_METADATA_DELETED" })
  | (Omit<ProjectMetadataUpdatedEvent, "type"> & { type: "PROJECT_METADATA_UPDATED" })
  | (Omit<ProjectUpdatedEvent, "type"> & { type: "PROJECT_UPDATED" })
  | (Omit<ProjectUserAddedEvent, "type"> & { type: "PROJECT_USER_ADDED" })
  | (Omit<ProjectUserRemovedEvent, "type"> & { type: "PROJECT_USER_REMOVED" })
  | (Omit<SdocDeletedEvent, "type"> & { type: "SDOC_DELETED" })
  | (Omit<SdocMetadataDeletedEvent, "type"> & { type: "SDOC_METADATA_DELETED" })
  | (Omit<SdocMetadataUpdatedEvent, "type"> & { type: "SDOC_METADATA_UPDATED" })
  | (Omit<SdocUpdatedEvent, "type"> & { type: "SDOC_UPDATED" })
  | (Omit<SentenceAnnotationCreatedEvent, "type"> & { type: "SENTENCE_ANNOTATION_CREATED" })
  | (Omit<SentenceAnnotationDeletedEvent, "type"> & { type: "SENTENCE_ANNOTATION_DELETED" })
  | (Omit<SentenceAnnotationUpdatedEvent, "type"> & { type: "SENTENCE_ANNOTATION_UPDATED" })
  | (Omit<SpanAnnotationCreatedEvent, "type"> & { type: "SPAN_ANNOTATION_CREATED" })
  | (Omit<SpanAnnotationDeletedEvent, "type"> & { type: "SPAN_ANNOTATION_DELETED" })
  | (Omit<SpanAnnotationUpdatedEvent, "type"> & { type: "SPAN_ANNOTATION_UPDATED" })
  | (Omit<SpanGroupCreatedEvent, "type"> & { type: "SPAN_GROUP_CREATED" })
  | (Omit<SpanGroupDeletedEvent, "type"> & { type: "SPAN_GROUP_DELETED" })
  | (Omit<SpanGroupUpdatedEvent, "type"> & { type: "SPAN_GROUP_UPDATED" })
  | (Omit<TagCreatedEvent, "type"> & { type: "TAG_CREATED" })
  | (Omit<TagDeletedEvent, "type"> & { type: "TAG_DELETED" })
  | (Omit<TagUpdatedEvent, "type"> & { type: "TAG_UPDATED" })
  | (Omit<TimelineAnalysisCreatedEvent, "type"> & { type: "TIMELINE_ANALYSIS_CREATED" })
  | (Omit<TimelineAnalysisDeletedEvent, "type"> & { type: "TIMELINE_ANALYSIS_DELETED" })
  | (Omit<TimelineAnalysisUpdatedEvent, "type"> & { type: "TIMELINE_ANALYSIS_UPDATED" })
  | (Omit<WhiteboardCreatedEvent, "type"> & { type: "WHITEBOARD_CREATED" })
  | (Omit<WhiteboardDeletedEvent, "type"> & { type: "WHITEBOARD_DELETED" })
  | (Omit<WhiteboardUpdatedEvent, "type"> & { type: "WHITEBOARD_UPDATED" });
