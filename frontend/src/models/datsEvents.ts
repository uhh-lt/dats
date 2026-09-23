/* eslint-disable */
// GENERATED FILE — do not edit. Regenerate with `just update-api`.
// Derived from the backend's DATS sync events (OpenAPI `webhooks`).

import type { ApiKeyCreatedEvent } from "./ApiKeyCreatedEvent";
import type { ApiKeyDeletedEvent } from "./ApiKeyDeletedEvent";
import type { AspectCreatedEvent } from "./AspectCreatedEvent";
import type { AspectDeletedEvent } from "./AspectDeletedEvent";
import type { AspectUpdatedEvent } from "./AspectUpdatedEvent";
import type { BboxAnnotationCreatedEvent } from "./BboxAnnotationCreatedEvent";
import type { BboxAnnotationDeletedEvent } from "./BboxAnnotationDeletedEvent";
import type { BboxAnnotationDeletedBatchEvent } from "./BboxAnnotationDeletedBatchEvent";
import type { BboxAnnotationUpdatedEvent } from "./BboxAnnotationUpdatedEvent";
import type { BboxAnnotationUpdatedBatchEvent } from "./BboxAnnotationUpdatedBatchEvent";
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
import type { FolderUpdatedBatchEvent } from "./FolderUpdatedBatchEvent";
import type { JobUpdatedEvent } from "./JobUpdatedEvent";
import type { MemoCreatedEvent } from "./MemoCreatedEvent";
import type { MemoDeletedEvent } from "./MemoDeletedEvent";
import type { MemoDeletedBatchEvent } from "./MemoDeletedBatchEvent";
import type { MemoUpdatedEvent } from "./MemoUpdatedEvent";
import type { MemoUpdatedBatchEvent } from "./MemoUpdatedBatchEvent";
import type { ProjectCreatedEvent } from "./ProjectCreatedEvent";
import type { ProjectDeletedEvent } from "./ProjectDeletedEvent";
import type { ProjectMetadataCreatedEvent } from "./ProjectMetadataCreatedEvent";
import type { ProjectMetadataDeletedEvent } from "./ProjectMetadataDeletedEvent";
import type { ProjectMetadataUpdatedEvent } from "./ProjectMetadataUpdatedEvent";
import type { ProjectUpdatedEvent } from "./ProjectUpdatedEvent";
import type { ProjectUsersLinkedEvent } from "./ProjectUsersLinkedEvent";
import type { SdocDeletedEvent } from "./SdocDeletedEvent";
import type { SdocDeletedBatchEvent } from "./SdocDeletedBatchEvent";
import type { SdocMetadataDeletedEvent } from "./SdocMetadataDeletedEvent";
import type { SdocMetadataUpdatedEvent } from "./SdocMetadataUpdatedEvent";
import type { SdocMetadataUpdatedBatchEvent } from "./SdocMetadataUpdatedBatchEvent";
import type { SdocTagsLinkedEvent } from "./SdocTagsLinkedEvent";
import type { SdocUpdatedEvent } from "./SdocUpdatedEvent";
import type { SearchViewCreatedEvent } from "./SearchViewCreatedEvent";
import type { SearchViewDeletedEvent } from "./SearchViewDeletedEvent";
import type { SearchViewUpdatedEvent } from "./SearchViewUpdatedEvent";
import type { SearchViewUpdatedBatchEvent } from "./SearchViewUpdatedBatchEvent";
import type { SentenceAnnotationCreatedEvent } from "./SentenceAnnotationCreatedEvent";
import type { SentenceAnnotationCreatedBatchEvent } from "./SentenceAnnotationCreatedBatchEvent";
import type { SentenceAnnotationDeletedEvent } from "./SentenceAnnotationDeletedEvent";
import type { SentenceAnnotationDeletedBatchEvent } from "./SentenceAnnotationDeletedBatchEvent";
import type { SentenceAnnotationUpdatedEvent } from "./SentenceAnnotationUpdatedEvent";
import type { SentenceAnnotationUpdatedBatchEvent } from "./SentenceAnnotationUpdatedBatchEvent";
import type { SpanAnnotationCreatedEvent } from "./SpanAnnotationCreatedEvent";
import type { SpanAnnotationCreatedBatchEvent } from "./SpanAnnotationCreatedBatchEvent";
import type { SpanAnnotationDeletedEvent } from "./SpanAnnotationDeletedEvent";
import type { SpanAnnotationDeletedBatchEvent } from "./SpanAnnotationDeletedBatchEvent";
import type { SpanAnnotationUpdatedEvent } from "./SpanAnnotationUpdatedEvent";
import type { SpanAnnotationUpdatedBatchEvent } from "./SpanAnnotationUpdatedBatchEvent";
import type { SpanGroupCreatedEvent } from "./SpanGroupCreatedEvent";
import type { SpanGroupDeletedEvent } from "./SpanGroupDeletedEvent";
import type { SpanGroupUpdatedEvent } from "./SpanGroupUpdatedEvent";
import type { TagCreatedEvent } from "./TagCreatedEvent";
import type { TagDeletedEvent } from "./TagDeletedEvent";
import type { TagRecommendationReviewedBatchEvent } from "./TagRecommendationReviewedBatchEvent";
import type { TagUpdatedEvent } from "./TagUpdatedEvent";
import type { TimelineAnalysisCreatedEvent } from "./TimelineAnalysisCreatedEvent";
import type { TimelineAnalysisDeletedEvent } from "./TimelineAnalysisDeletedEvent";
import type { TimelineAnalysisUpdatedEvent } from "./TimelineAnalysisUpdatedEvent";
import type { UserDeletedEvent } from "./UserDeletedEvent";
import type { UserUpdatedEvent } from "./UserUpdatedEvent";
import type { WhiteboardCreatedEvent } from "./WhiteboardCreatedEvent";
import type { WhiteboardDeletedEvent } from "./WhiteboardDeletedEvent";
import type { WhiteboardUpdatedEvent } from "./WhiteboardUpdatedEvent";

/** Payload type for each DATS event type. */
export interface DATSEventMap {
  API_KEY_CREATED: ApiKeyCreatedEvent["payload"];
  API_KEY_DELETED: ApiKeyDeletedEvent["payload"];
  ASPECT_CREATED: AspectCreatedEvent["payload"];
  ASPECT_DELETED: AspectDeletedEvent["payload"];
  ASPECT_UPDATED: AspectUpdatedEvent["payload"];
  BBOX_ANNOTATION_CREATED: BboxAnnotationCreatedEvent["payload"];
  BBOX_ANNOTATION_DELETED: BboxAnnotationDeletedEvent["payload"];
  BBOX_ANNOTATION_DELETED_BATCH: BboxAnnotationDeletedBatchEvent["payload"];
  BBOX_ANNOTATION_UPDATED: BboxAnnotationUpdatedEvent["payload"];
  BBOX_ANNOTATION_UPDATED_BATCH: BboxAnnotationUpdatedBatchEvent["payload"];
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
  FOLDER_UPDATED_BATCH: FolderUpdatedBatchEvent["payload"];
  JOB_UPDATED: JobUpdatedEvent["payload"];
  MEMO_CREATED: MemoCreatedEvent["payload"];
  MEMO_DELETED: MemoDeletedEvent["payload"];
  MEMO_DELETED_BATCH: MemoDeletedBatchEvent["payload"];
  MEMO_UPDATED: MemoUpdatedEvent["payload"];
  MEMO_UPDATED_BATCH: MemoUpdatedBatchEvent["payload"];
  PROJECT_CREATED: ProjectCreatedEvent["payload"];
  PROJECT_DELETED: ProjectDeletedEvent["payload"];
  PROJECT_METADATA_CREATED: ProjectMetadataCreatedEvent["payload"];
  PROJECT_METADATA_DELETED: ProjectMetadataDeletedEvent["payload"];
  PROJECT_METADATA_UPDATED: ProjectMetadataUpdatedEvent["payload"];
  PROJECT_UPDATED: ProjectUpdatedEvent["payload"];
  PROJECT_USERS_LINKED: ProjectUsersLinkedEvent["payload"];
  SDOC_DELETED: SdocDeletedEvent["payload"];
  SDOC_DELETED_BATCH: SdocDeletedBatchEvent["payload"];
  SDOC_METADATA_DELETED: SdocMetadataDeletedEvent["payload"];
  SDOC_METADATA_UPDATED: SdocMetadataUpdatedEvent["payload"];
  SDOC_METADATA_UPDATED_BATCH: SdocMetadataUpdatedBatchEvent["payload"];
  SDOC_TAGS_LINKED: SdocTagsLinkedEvent["payload"];
  SDOC_UPDATED: SdocUpdatedEvent["payload"];
  SEARCH_VIEW_CREATED: SearchViewCreatedEvent["payload"];
  SEARCH_VIEW_DELETED: SearchViewDeletedEvent["payload"];
  SEARCH_VIEW_UPDATED: SearchViewUpdatedEvent["payload"];
  SEARCH_VIEW_UPDATED_BATCH: SearchViewUpdatedBatchEvent["payload"];
  SENTENCE_ANNOTATION_CREATED: SentenceAnnotationCreatedEvent["payload"];
  SENTENCE_ANNOTATION_CREATED_BATCH: SentenceAnnotationCreatedBatchEvent["payload"];
  SENTENCE_ANNOTATION_DELETED: SentenceAnnotationDeletedEvent["payload"];
  SENTENCE_ANNOTATION_DELETED_BATCH: SentenceAnnotationDeletedBatchEvent["payload"];
  SENTENCE_ANNOTATION_UPDATED: SentenceAnnotationUpdatedEvent["payload"];
  SENTENCE_ANNOTATION_UPDATED_BATCH: SentenceAnnotationUpdatedBatchEvent["payload"];
  SPAN_ANNOTATION_CREATED: SpanAnnotationCreatedEvent["payload"];
  SPAN_ANNOTATION_CREATED_BATCH: SpanAnnotationCreatedBatchEvent["payload"];
  SPAN_ANNOTATION_DELETED: SpanAnnotationDeletedEvent["payload"];
  SPAN_ANNOTATION_DELETED_BATCH: SpanAnnotationDeletedBatchEvent["payload"];
  SPAN_ANNOTATION_UPDATED: SpanAnnotationUpdatedEvent["payload"];
  SPAN_ANNOTATION_UPDATED_BATCH: SpanAnnotationUpdatedBatchEvent["payload"];
  SPAN_GROUP_CREATED: SpanGroupCreatedEvent["payload"];
  SPAN_GROUP_DELETED: SpanGroupDeletedEvent["payload"];
  SPAN_GROUP_UPDATED: SpanGroupUpdatedEvent["payload"];
  TAG_CREATED: TagCreatedEvent["payload"];
  TAG_DELETED: TagDeletedEvent["payload"];
  TAG_RECOMMENDATION_REVIEWED_BATCH: TagRecommendationReviewedBatchEvent["payload"];
  TAG_UPDATED: TagUpdatedEvent["payload"];
  TIMELINE_ANALYSIS_CREATED: TimelineAnalysisCreatedEvent["payload"];
  TIMELINE_ANALYSIS_DELETED: TimelineAnalysisDeletedEvent["payload"];
  TIMELINE_ANALYSIS_UPDATED: TimelineAnalysisUpdatedEvent["payload"];
  USER_DELETED: UserDeletedEvent["payload"];
  USER_UPDATED: UserUpdatedEvent["payload"];
  WHITEBOARD_CREATED: WhiteboardCreatedEvent["payload"];
  WHITEBOARD_DELETED: WhiteboardDeletedEvent["payload"];
  WHITEBOARD_UPDATED: WhiteboardUpdatedEvent["payload"];
}

/** Discriminated union of all DATS events, keyed by `type`. */
export type DATSEvent =
  | (Omit<ApiKeyCreatedEvent, "type"> & { type: "API_KEY_CREATED" })
  | (Omit<ApiKeyDeletedEvent, "type"> & { type: "API_KEY_DELETED" })
  | (Omit<AspectCreatedEvent, "type"> & { type: "ASPECT_CREATED" })
  | (Omit<AspectDeletedEvent, "type"> & { type: "ASPECT_DELETED" })
  | (Omit<AspectUpdatedEvent, "type"> & { type: "ASPECT_UPDATED" })
  | (Omit<BboxAnnotationCreatedEvent, "type"> & { type: "BBOX_ANNOTATION_CREATED" })
  | (Omit<BboxAnnotationDeletedEvent, "type"> & { type: "BBOX_ANNOTATION_DELETED" })
  | (Omit<BboxAnnotationDeletedBatchEvent, "type"> & { type: "BBOX_ANNOTATION_DELETED_BATCH" })
  | (Omit<BboxAnnotationUpdatedEvent, "type"> & { type: "BBOX_ANNOTATION_UPDATED" })
  | (Omit<BboxAnnotationUpdatedBatchEvent, "type"> & { type: "BBOX_ANNOTATION_UPDATED_BATCH" })
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
  | (Omit<FolderUpdatedBatchEvent, "type"> & { type: "FOLDER_UPDATED_BATCH" })
  | (Omit<JobUpdatedEvent, "type"> & { type: "JOB_UPDATED" })
  | (Omit<MemoCreatedEvent, "type"> & { type: "MEMO_CREATED" })
  | (Omit<MemoDeletedEvent, "type"> & { type: "MEMO_DELETED" })
  | (Omit<MemoDeletedBatchEvent, "type"> & { type: "MEMO_DELETED_BATCH" })
  | (Omit<MemoUpdatedEvent, "type"> & { type: "MEMO_UPDATED" })
  | (Omit<MemoUpdatedBatchEvent, "type"> & { type: "MEMO_UPDATED_BATCH" })
  | (Omit<ProjectCreatedEvent, "type"> & { type: "PROJECT_CREATED" })
  | (Omit<ProjectDeletedEvent, "type"> & { type: "PROJECT_DELETED" })
  | (Omit<ProjectMetadataCreatedEvent, "type"> & { type: "PROJECT_METADATA_CREATED" })
  | (Omit<ProjectMetadataDeletedEvent, "type"> & { type: "PROJECT_METADATA_DELETED" })
  | (Omit<ProjectMetadataUpdatedEvent, "type"> & { type: "PROJECT_METADATA_UPDATED" })
  | (Omit<ProjectUpdatedEvent, "type"> & { type: "PROJECT_UPDATED" })
  | (Omit<ProjectUsersLinkedEvent, "type"> & { type: "PROJECT_USERS_LINKED" })
  | (Omit<SdocDeletedEvent, "type"> & { type: "SDOC_DELETED" })
  | (Omit<SdocDeletedBatchEvent, "type"> & { type: "SDOC_DELETED_BATCH" })
  | (Omit<SdocMetadataDeletedEvent, "type"> & { type: "SDOC_METADATA_DELETED" })
  | (Omit<SdocMetadataUpdatedEvent, "type"> & { type: "SDOC_METADATA_UPDATED" })
  | (Omit<SdocMetadataUpdatedBatchEvent, "type"> & { type: "SDOC_METADATA_UPDATED_BATCH" })
  | (Omit<SdocTagsLinkedEvent, "type"> & { type: "SDOC_TAGS_LINKED" })
  | (Omit<SdocUpdatedEvent, "type"> & { type: "SDOC_UPDATED" })
  | (Omit<SearchViewCreatedEvent, "type"> & { type: "SEARCH_VIEW_CREATED" })
  | (Omit<SearchViewDeletedEvent, "type"> & { type: "SEARCH_VIEW_DELETED" })
  | (Omit<SearchViewUpdatedEvent, "type"> & { type: "SEARCH_VIEW_UPDATED" })
  | (Omit<SearchViewUpdatedBatchEvent, "type"> & { type: "SEARCH_VIEW_UPDATED_BATCH" })
  | (Omit<SentenceAnnotationCreatedEvent, "type"> & { type: "SENTENCE_ANNOTATION_CREATED" })
  | (Omit<SentenceAnnotationCreatedBatchEvent, "type"> & { type: "SENTENCE_ANNOTATION_CREATED_BATCH" })
  | (Omit<SentenceAnnotationDeletedEvent, "type"> & { type: "SENTENCE_ANNOTATION_DELETED" })
  | (Omit<SentenceAnnotationDeletedBatchEvent, "type"> & { type: "SENTENCE_ANNOTATION_DELETED_BATCH" })
  | (Omit<SentenceAnnotationUpdatedEvent, "type"> & { type: "SENTENCE_ANNOTATION_UPDATED" })
  | (Omit<SentenceAnnotationUpdatedBatchEvent, "type"> & { type: "SENTENCE_ANNOTATION_UPDATED_BATCH" })
  | (Omit<SpanAnnotationCreatedEvent, "type"> & { type: "SPAN_ANNOTATION_CREATED" })
  | (Omit<SpanAnnotationCreatedBatchEvent, "type"> & { type: "SPAN_ANNOTATION_CREATED_BATCH" })
  | (Omit<SpanAnnotationDeletedEvent, "type"> & { type: "SPAN_ANNOTATION_DELETED" })
  | (Omit<SpanAnnotationDeletedBatchEvent, "type"> & { type: "SPAN_ANNOTATION_DELETED_BATCH" })
  | (Omit<SpanAnnotationUpdatedEvent, "type"> & { type: "SPAN_ANNOTATION_UPDATED" })
  | (Omit<SpanAnnotationUpdatedBatchEvent, "type"> & { type: "SPAN_ANNOTATION_UPDATED_BATCH" })
  | (Omit<SpanGroupCreatedEvent, "type"> & { type: "SPAN_GROUP_CREATED" })
  | (Omit<SpanGroupDeletedEvent, "type"> & { type: "SPAN_GROUP_DELETED" })
  | (Omit<SpanGroupUpdatedEvent, "type"> & { type: "SPAN_GROUP_UPDATED" })
  | (Omit<TagCreatedEvent, "type"> & { type: "TAG_CREATED" })
  | (Omit<TagDeletedEvent, "type"> & { type: "TAG_DELETED" })
  | (Omit<TagRecommendationReviewedBatchEvent, "type"> & { type: "TAG_RECOMMENDATION_REVIEWED_BATCH" })
  | (Omit<TagUpdatedEvent, "type"> & { type: "TAG_UPDATED" })
  | (Omit<TimelineAnalysisCreatedEvent, "type"> & { type: "TIMELINE_ANALYSIS_CREATED" })
  | (Omit<TimelineAnalysisDeletedEvent, "type"> & { type: "TIMELINE_ANALYSIS_DELETED" })
  | (Omit<TimelineAnalysisUpdatedEvent, "type"> & { type: "TIMELINE_ANALYSIS_UPDATED" })
  | (Omit<UserDeletedEvent, "type"> & { type: "USER_DELETED" })
  | (Omit<UserUpdatedEvent, "type"> & { type: "USER_UPDATED" })
  | (Omit<WhiteboardCreatedEvent, "type"> & { type: "WHITEBOARD_CREATED" })
  | (Omit<WhiteboardDeletedEvent, "type"> & { type: "WHITEBOARD_DELETED" })
  | (Omit<WhiteboardUpdatedEvent, "type"> & { type: "WHITEBOARD_UPDATED" });
