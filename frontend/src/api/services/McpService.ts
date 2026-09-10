/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AttachedObjectType } from "@models/AttachedObjectType";
import type { BBoxAnnotationCreate } from "@models/BBoxAnnotationCreate";
import type { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import type { BBoxAnnotationUpdate } from "@models/BBoxAnnotationUpdate";
import type { BBoxAnnotationUpdateBulk } from "@models/BBoxAnnotationUpdateBulk";
import type { Body_search_search_sdocs } from "@models/Body_search_search_sdocs";
import type { Body_sentenceAnnotation_count_annotations } from "@models/Body_sentenceAnnotation_count_annotations";
import type { Body_spanAnnotation_count_annotations } from "@models/Body_spanAnnotation_count_annotations";
import type { Body_tag_count_tags } from "@models/Body_tag_count_tags";
import type { Body_tag_update_tags_batch } from "@models/Body_tag_update_tags_batch";
import type { CodeCreate } from "@models/CodeCreate";
import type { CodeRead } from "@models/CodeRead";
import type { CodeUpdate } from "@models/CodeUpdate";
import type { ColumnInfo_BBoxColumns_ } from "@models/ColumnInfo_BBoxColumns_";
import type { ColumnInfo_MemoColumns_ } from "@models/ColumnInfo_MemoColumns_";
import type { ColumnInfo_SdocColumns_ } from "@models/ColumnInfo_SdocColumns_";
import type { ColumnInfo_SentAnnoColumns_ } from "@models/ColumnInfo_SentAnnoColumns_";
import type { ColumnInfo_SpanColumns_ } from "@models/ColumnInfo_SpanColumns_";
import type { FolderCreate } from "@models/FolderCreate";
import type { FolderRead } from "@models/FolderRead";
import type { FolderType } from "@models/FolderType";
import type { FolderUpdate } from "@models/FolderUpdate";
import type { GroupPage } from "@models/GroupPage";
import type { GroupQueryRequest_BBoxColumns_ } from "@models/GroupQueryRequest_BBoxColumns_";
import type { GroupQueryRequest_MemoColumns_ } from "@models/GroupQueryRequest_MemoColumns_";
import type { GroupQueryRequest_SentAnnoColumns_ } from "@models/GroupQueryRequest_SentAnnoColumns_";
import type { GroupQueryRequest_SpanColumns_ } from "@models/GroupQueryRequest_SpanColumns_";
import type { MemoCreate } from "@models/MemoCreate";
import type { MemoRead } from "@models/MemoRead";
import type { MemoUpdate } from "@models/MemoUpdate";
import type { Page_BBoxAnnotationRow_ } from "@models/Page_BBoxAnnotationRow_";
import type { Page_MemoRead_ } from "@models/Page_MemoRead_";
import type { Page_SentenceAnnotationRow_ } from "@models/Page_SentenceAnnotationRow_";
import type { Page_SpanAnnotationRow_ } from "@models/Page_SpanAnnotationRow_";
import type { PaginatedSDocHits } from "@models/PaginatedSDocHits";
import type { ProjectAddUser } from "@models/ProjectAddUser";
import type { ProjectCreate } from "@models/ProjectCreate";
import type { ProjectMetadataCreate } from "@models/ProjectMetadataCreate";
import type { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import type { ProjectMetadataUpdate } from "@models/ProjectMetadataUpdate";
import type { ProjectRead } from "@models/ProjectRead";
import type { ProjectUpdate } from "@models/ProjectUpdate";
import type { PublicUserRead } from "@models/PublicUserRead";
import type { QueryRequest_BBoxColumns_ } from "@models/QueryRequest_BBoxColumns_";
import type { QueryRequest_MemoColumns_ } from "@models/QueryRequest_MemoColumns_";
import type { QueryRequest_SentAnnoColumns_ } from "@models/QueryRequest_SentAnnoColumns_";
import type { QueryRequest_SpanColumns_ } from "@models/QueryRequest_SpanColumns_";
import type { SDocStatus } from "@models/SDocStatus";
import type { SentenceAnnotationCreate } from "@models/SentenceAnnotationCreate";
import type { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import type { SentenceAnnotationUpdate } from "@models/SentenceAnnotationUpdate";
import type { SentenceAnnotationUpdateBulk } from "@models/SentenceAnnotationUpdateBulk";
import type { SentenceAnnotatorResult } from "@models/SentenceAnnotatorResult";
import type { SourceDocumentDataRead } from "@models/SourceDocumentDataRead";
import type { SourceDocumentMetadataBulkUpdate } from "@models/SourceDocumentMetadataBulkUpdate";
import type { SourceDocumentMetadataRead } from "@models/SourceDocumentMetadataRead";
import type { SourceDocumentMetadataUpdate } from "@models/SourceDocumentMetadataUpdate";
import type { SourceDocumentRead } from "@models/SourceDocumentRead";
import type { SourceDocumentTagLinks } from "@models/SourceDocumentTagLinks";
import type { SourceDocumentTagMultiLink } from "@models/SourceDocumentTagMultiLink";
import type { SourceDocumentUpdate } from "@models/SourceDocumentUpdate";
import type { SpanAnnotationCreate } from "@models/SpanAnnotationCreate";
import type { SpanAnnotationDeleted } from "@models/SpanAnnotationDeleted";
import type { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import type { SpanAnnotationUpdate } from "@models/SpanAnnotationUpdate";
import type { SpanAnnotationUpdateBulk } from "@models/SpanAnnotationUpdateBulk";
import type { SpanGroupRead } from "@models/SpanGroupRead";
import type { TagCreate } from "@models/TagCreate";
import type { TagRead } from "@models/TagRead";
import type { TagUpdate } from "@models/TagUpdate";
import type { UserRead } from "@models/UserRead";
import type { UserUpdate } from "@models/UserUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class McpService {
  /**
   * Creates a BBoxAnnotation
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addBboxAnnotation({
    requestBody,
  }: {
    requestBody: BBoxAnnotationCreate;
  }): CancelablePromise<BBoxAnnotationRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/bbox",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the BBoxAnnotation with the given ID.
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getById({ bboxId }: { bboxId: number }): CancelablePromise<BBoxAnnotationRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/bbox/{bbox_id}",
      path: {
        bbox_id: bboxId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the BBoxAnnotation with the given ID.
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateById({
    bboxId,
    requestBody,
  }: {
    bboxId: number;
    requestBody: BBoxAnnotationUpdate;
  }): CancelablePromise<BBoxAnnotationRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/bbox/{bbox_id}",
      path: {
        bbox_id: bboxId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the BBoxAnnotation with the given ID.
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ bboxId }: { bboxId: number }): CancelablePromise<BBoxAnnotationRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/bbox/{bbox_id}",
      path: {
        bbox_id: bboxId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all BBoxAnnotations of the User for the SourceDocument
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getBySdocAndUser({
    sdocId,
    userId,
  }: {
    sdocId: number;
    userId: number;
  }): CancelablePromise<Array<BBoxAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/bbox/sdoc/{sdoc_id}/user/{user_id}",
      path: {
        sdoc_id: sdocId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates BBoxAnnotation in Bulk
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateBboxAnnoAnnotationsBulk({
    requestBody,
  }: {
    requestBody: Array<BBoxAnnotationUpdateBulk>;
  }): CancelablePromise<Array<BBoxAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/bbox/bulk/update",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes all BBoxAnnotations with the given IDs.
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static deleteBulkById({
    requestBody,
  }: {
    requestBody: Array<number>;
  }): CancelablePromise<Array<BBoxAnnotationRead>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/bbox/bulk/delete",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns BBoxAnnotations with the given Code of the logged-in User
   * @returns BBoxAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getByUserCode({ codeId }: { codeId: number }): CancelablePromise<Array<BBoxAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/bbox/code/{code_id}/user",
      path: {
        code_id: codeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates a new Code and returns it with the generated ID.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static createNewCode({ requestBody }: { requestBody: CodeCreate }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/code",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Code with the given ID.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getById1({ codeId }: { codeId: number }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/code/{code_id}",
      path: {
        code_id: codeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Code with the given ID.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static updateById1({
    codeId,
    requestBody,
  }: {
    codeId: number;
    requestBody: CodeUpdate;
  }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/code/{code_id}",
      path: {
        code_id: codeId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the Code with the given ID.
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static deleteById1({ codeId }: { codeId: number }): CancelablePromise<CodeRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/code/{code_id}",
      path: {
        code_id: codeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all Codes of the Project with the given ID
   * @returns CodeRead Successful Response
   * @throws ApiError
   */
  public static getByProject({ projId }: { projId: number }): CancelablePromise<Array<CodeRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/code/project/{proj_id}",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Get Folder By Id
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static getFolderById({ folderId }: { folderId: number }): CancelablePromise<FolderRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/folder/{folder_id}",
      path: {
        folder_id: folderId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Update Folder
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static updateFolder({
    folderId,
    requestBody,
  }: {
    folderId: number;
    requestBody: FolderUpdate;
  }): CancelablePromise<FolderRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/folder/{folder_id}",
      path: {
        folder_id: folderId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Delete Folder
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static deleteFolder({ folderId }: { folderId: number }): CancelablePromise<FolderRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/folder/{folder_id}",
      path: {
        folder_id: folderId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns lists of source document ids per doctype in the specified sdoc folder
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getSdocIdsInFolderByDoctype({
    folderId,
  }: {
    folderId: number;
  }): CancelablePromise<Record<string, Array<number>>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/folder/sdocids/{folder_id}",
      path: {
        folder_id: folderId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the folders of the folder_type of the project with the given ID
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static getFoldersByProjectAndType({
    projectId,
    folderType,
  }: {
    projectId: number;
    folderType: FolderType;
  }): CancelablePromise<Array<FolderRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/folder/project/{project_id}/folder/{folder_type}",
      path: {
        project_id: projectId,
        folder_type: folderType,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Create Folder
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static createFolder({ requestBody }: { requestBody: FolderCreate }): CancelablePromise<FolderRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/folder/",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Move Folders
   * @returns FolderRead Successful Response
   * @throws ApiError
   */
  public static moveFolders({
    targetFolderId,
    requestBody,
  }: {
    targetFolderId: number;
    requestBody: Array<number>;
  }): CancelablePromise<Array<FolderRead>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/folder/move_folders",
      query: {
        target_folder_id: targetFolderId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Adds a Memo to the Attached Object with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static addMemo({
    attachedObjectId,
    attachedObjectType,
    requestBody,
  }: {
    attachedObjectId: number;
    attachedObjectType: AttachedObjectType;
    requestBody: MemoCreate;
  }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/memo",
      query: {
        attached_object_id: attachedObjectId,
        attached_object_type: attachedObjectType,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the current user's most recently opened Memos in the project
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getRecentMemos({
    projectId,
    limit = 10,
  }: {
    projectId: number;
    limit?: number;
  }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/memo/recent",
      query: {
        project_id: projectId,
        limit: limit,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Records that the current user opened the Memo with the given ID
   * @returns void
   * @throws ApiError
   */
  public static recordRecentMemo({ memoId }: { memoId: number }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/memo/{memo_id}/recent",
      path: {
        memo_id: memoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Memo with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getById2({ memoId }: { memoId: number }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/memo/{memo_id}",
      path: {
        memo_id: memoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Memo with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static updateById2({
    memoId,
    requestBody,
  }: {
    memoId: number;
    requestBody: MemoUpdate;
  }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/memo/{memo_id}",
      path: {
        memo_id: memoId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the Memo with the given ID if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static deleteById2({ memoId }: { memoId: number }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/memo/{memo_id}",
      path: {
        memo_id: memoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all Memos attached to the object if it exists
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static getMemosByAttachedObjectId({
    attachedObjId,
    attachedObjType,
  }: {
    attachedObjId: number;
    attachedObjType: AttachedObjectType;
  }): CancelablePromise<Array<MemoRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/memo/attached_obj/{attached_obj_type}/to/{attached_obj_id}",
      path: {
        attached_obj_id: attachedObjId,
        attached_obj_type: attachedObjType,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Favorites a Memo for the current user
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static favoriteById({ memoId }: { memoId: number }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/memo/{memo_id}/favorite",
      path: {
        memo_id: memoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the current user's Memo favorite
   * @returns MemoRead Successful Response
   * @throws ApiError
   */
  public static unfavoriteById({ memoId }: { memoId: number }): CancelablePromise<MemoRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/memo/{memo_id}/favorite",
      path: {
        memo_id: memoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Generates a 1–2 sentence memo suggestion using LLM based on the attached object
   * @returns string Successful Response
   * @throws ApiError
   */
  public static generateMemoSuggestion({
    attachedObjId,
    attachedObjType,
    model,
  }: {
    attachedObjId: number;
    attachedObjType: AttachedObjectType;
    model: string;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/memo/generate_suggestion/{attached_obj_type}/{attached_obj_id}",
      path: {
        attached_obj_id: attachedObjId,
        attached_obj_type: attachedObjType,
      },
      query: {
        model: model,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates a new Project
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static createNewProject({ requestBody }: { requestBody: ProjectCreate }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/project",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Project with the given ID if it exists
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static readProject({ projId }: { projId: number }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Project with the given ID.
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static updateProject({
    projId,
    requestBody,
  }: {
    projId: number;
    requestBody: ProjectUpdate;
  }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/project/{proj_id}",
      path: {
        proj_id: projId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the Project with the given ID.
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static deleteProject({ projId }: { projId: number }): CancelablePromise<ProjectRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/project/{proj_id}",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Id of the SourceDocument identified by project_id and filename if it exists
   * @returns number Successful Response
   * @throws ApiError
   */
  public static resolveFilename({
    projId,
    filename,
    onlyFinished = true,
  }: {
    projId: number;
    filename: string;
    onlyFinished?: boolean;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/{proj_id}/resolve_filename/{filename}",
      path: {
        proj_id: projId,
        filename: filename,
      },
      query: {
        only_finished: onlyFinished,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all Projects of the logged-in User
   * @returns ProjectRead Successful Response
   * @throws ApiError
   */
  public static getUserProjects(): CancelablePromise<Array<ProjectRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project/user/projects",
    });
  }
  /**
   * Returns count of SourceDocuments with the given status in the given project.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static countSdocsWithStatus({
    projectId,
    status,
  }: {
    projectId: number;
    status: SDocStatus;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/project{project_id}/sdoc/status/{status}",
      path: {
        project_id: projectId,
        status: status,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates a new Metadata and returns it with the generated ID.
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static createNewMetadata({
    requestBody,
  }: {
    requestBody: ProjectMetadataCreate;
  }): CancelablePromise<ProjectMetadataRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projmeta",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Metadata with the given ID.
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static getById3({ metadataId }: { metadataId: number }): CancelablePromise<ProjectMetadataRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projmeta/{metadata_id}",
      path: {
        metadata_id: metadataId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Metadata with the given ID.
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static updateById3({
    metadataId,
    requestBody,
  }: {
    metadataId: number;
    requestBody: ProjectMetadataUpdate;
  }): CancelablePromise<ProjectMetadataRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projmeta/{metadata_id}",
      path: {
        metadata_id: metadataId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the Metadata with the given ID.
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static deleteById3({ metadataId }: { metadataId: number }): CancelablePromise<ProjectMetadataRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projmeta/{metadata_id}",
      path: {
        metadata_id: metadataId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all ProjectMetadata of the Project with the given ID if it exists
   * @returns ProjectMetadataRead Successful Response
   * @throws ApiError
   */
  public static getByProject1({ projId }: { projId: number }): CancelablePromise<Array<ProjectMetadataRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projmeta/project/{proj_id}",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns Search Info.
   * @returns ColumnInfo_SdocColumns_ Successful Response
   * @throws ApiError
   */
  public static searchSdocInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_SdocColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sdoc_info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SourceDocument Ids and their scores and (optional) hightlights that match the query parameters.
   * @returns PaginatedSDocHits Successful Response
   * @throws ApiError
   */
  public static searchSdocs({
    projectId,
    searchQuery,
    expertMode,
    highlight,
    requestBody,
    folderId,
    pageNumber,
    pageSize,
    showFolders = true,
    showChildFolders = false,
  }: {
    projectId: number;
    searchQuery: string;
    expertMode: boolean;
    highlight: boolean;
    requestBody: Body_search_search_sdocs;
    folderId?: number | null;
    pageNumber?: number | null;
    pageSize?: number | null;
    showFolders?: boolean;
    showChildFolders?: boolean;
  }): CancelablePromise<PaginatedSDocHits> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sdoc",
      query: {
        project_id: projectId,
        search_query: searchQuery,
        expert_mode: expertMode,
        highlight: highlight,
        folder_id: folderId,
        page_number: pageNumber,
        page_size: pageSize,
        show_folders: showFolders,
        show_child_folders: showChildFolders,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns Memo Table Info.
   * @returns ColumnInfo_MemoColumns_ Successful Response
   * @throws ApiError
   */
  public static searchMemoInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_MemoColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/memo_info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Queries Memo summaries for a workspace view
   * @returns Page_MemoRead_ Successful Response
   * @throws ApiError
   */
  public static searchMemos({
    requestBody,
  }: {
    requestBody: QueryRequest_MemoColumns_;
  }): CancelablePromise<Page_MemoRead_> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/memo",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Queries paginated Memo groups for a workspace view
   * @returns GroupPage Successful Response
   * @throws ApiError
   */
  public static searchMemoGroups({
    requestBody,
  }: {
    requestBody: GroupQueryRequest_MemoColumns_;
  }): CancelablePromise<GroupPage> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/memo/groups",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns SpanAnnotationSearch Info.
   * @returns ColumnInfo_SpanColumns_ Successful Response
   * @throws ApiError
   */
  public static searchSpanAnnotationInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_SpanColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/span_annotation_info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns SpanAnnotationSearch.
   * @returns Page_SpanAnnotationRow_ Successful Response
   * @throws ApiError
   */
  public static searchSpanAnnotations({
    requestBody,
  }: {
    requestBody: QueryRequest_SpanColumns_;
  }): CancelablePromise<Page_SpanAnnotationRow_> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/span_annotation",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns paginated SpanAnnotation groups.
   * @returns GroupPage Successful Response
   * @throws ApiError
   */
  public static searchSpanAnnotationGroups({
    requestBody,
  }: {
    requestBody: GroupQueryRequest_SpanColumns_;
  }): CancelablePromise<GroupPage> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/span_annotation/groups",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns SentenceAnnotationSearch Info.
   * @returns ColumnInfo_SentAnnoColumns_ Successful Response
   * @throws ApiError
   */
  public static searchSentenceAnnotationInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_SentAnnoColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sentence_annotation_info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns Sentence Annotations.
   * @returns Page_SentenceAnnotationRow_ Successful Response
   * @throws ApiError
   */
  public static searchSentenceAnnotations({
    requestBody,
  }: {
    requestBody: QueryRequest_SentAnnoColumns_;
  }): CancelablePromise<Page_SentenceAnnotationRow_> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sentence_annotation",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns paginated Sentence Annotation groups.
   * @returns GroupPage Successful Response
   * @throws ApiError
   */
  public static searchSentenceAnnotationGroups({
    requestBody,
  }: {
    requestBody: GroupQueryRequest_SentAnnoColumns_;
  }): CancelablePromise<GroupPage> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sentence_annotation/groups",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns BBoxAnnotationSearch Info.
   * @returns ColumnInfo_BBoxColumns_ Successful Response
   * @throws ApiError
   */
  public static searchBboxAnnotationInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_BBoxColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/bbox_annotation_info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns BBox Annotations.
   * @returns Page_BBoxAnnotationRow_ Successful Response
   * @throws ApiError
   */
  public static searchBboxAnnotations({
    requestBody,
  }: {
    requestBody: QueryRequest_BBoxColumns_;
  }): CancelablePromise<Page_BBoxAnnotationRow_> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/bbox_annotation",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns paginated BBox Annotation groups.
   * @returns GroupPage Successful Response
   * @throws ApiError
   */
  public static searchBboxAnnotationGroups({
    requestBody,
  }: {
    requestBody: GroupQueryRequest_BBoxColumns_;
  }): CancelablePromise<GroupPage> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/bbox_annotation/groups",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates a SentenceAnnotation
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addSentenceAnnotation({
    requestBody,
  }: {
    requestBody: SentenceAnnotationCreate;
  }): CancelablePromise<SentenceAnnotationRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/sentence",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates SentenceAnnotations in Bulk
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addSentenceAnnotationsBulk({
    requestBody,
  }: {
    requestBody: Array<SentenceAnnotationCreate>;
  }): CancelablePromise<Array<SentenceAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/sentence/bulk/create",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the SentenceAnnotation with the given ID.
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getById4({ sentenceAnnoId }: { sentenceAnnoId: number }): CancelablePromise<SentenceAnnotationRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sentence/{sentence_anno_id}",
      path: {
        sentence_anno_id: sentenceAnnoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the SentenceAnnotation with the given ID.
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateById4({
    sentenceAnnoId,
    requestBody,
  }: {
    sentenceAnnoId: number;
    requestBody: SentenceAnnotationUpdate;
  }): CancelablePromise<SentenceAnnotationRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sentence/{sentence_anno_id}",
      path: {
        sentence_anno_id: sentenceAnnoId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the SentenceAnnotation with the given ID.
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static deleteById4({ sentenceAnnoId }: { sentenceAnnoId: number }): CancelablePromise<SentenceAnnotationRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/sentence/{sentence_anno_id}",
      path: {
        sentence_anno_id: sentenceAnnoId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SentenceAnnotations of the User for the SourceDocument
   * @returns SentenceAnnotatorResult Successful Response
   * @throws ApiError
   */
  public static getBySdocAndUser1({
    sdocId,
    userId,
  }: {
    sdocId: number;
    userId: number;
  }): CancelablePromise<SentenceAnnotatorResult> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sentence/sdoc/{sdoc_id}/user/{user_id}",
      path: {
        sdoc_id: sdocId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates SentenceAnnotation in Bulk
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateSentAnnoAnnotationsBulk({
    requestBody,
  }: {
    requestBody: Array<SentenceAnnotationUpdateBulk>;
  }): CancelablePromise<Array<SentenceAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sentence/bulk/update",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes all SentenceAnnotations with the given IDs.
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static deleteBulkById1({
    requestBody,
  }: {
    requestBody: Array<number>;
  }): CancelablePromise<Array<SentenceAnnotationRead>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/sentence/bulk/delete",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns SentenceAnnotations with the given Code of the logged-in User
   * @returns SentenceAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getByUserCode1({ codeId }: { codeId: number }): CancelablePromise<Array<SentenceAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sentence/code/{code_id}/user",
      path: {
        code_id: codeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Counts the SentenceAnnotations of the User (by user_id) per Codes (by class_ids) in Documents (by sdoc_ids)
   * @returns number Successful Response
   * @throws ApiError
   */
  public static countAnnotations({
    userId,
    requestBody,
  }: {
    userId: number;
    requestBody: Body_sentenceAnnotation_count_annotations;
  }): CancelablePromise<Record<string, number>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/sentence/count_annotations/{user_id}",
      path: {
        user_id: userId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the SourceDocument with the given ID if it exists
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static getById5({
    sdocId,
    onlyIfFinished = true,
  }: {
    sdocId: number;
    onlyIfFinished?: boolean;
  }): CancelablePromise<SourceDocumentRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}",
      path: {
        sdoc_id: sdocId,
      },
      query: {
        only_if_finished: onlyIfFinished,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the SourceDocument with the given ID if it exists
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static deleteById5({ sdocId }: { sdocId: number }): CancelablePromise<SourceDocumentRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/sdoc/{sdoc_id}",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the SourceDocument with the given ID.
   * @returns SourceDocumentRead Successful Response
   * @throws ApiError
   */
  public static updateSdoc({
    sdocId,
    requestBody,
  }: {
    sdocId: number;
    requestBody: SourceDocumentUpdate;
  }): CancelablePromise<SourceDocumentRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sdoc/{sdoc_id}",
      path: {
        sdoc_id: sdocId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the SourceDocumentData with the given ID if it exists
   * @returns SourceDocumentDataRead Successful Response
   * @throws ApiError
   */
  public static getByIdWithData({
    sdocId,
    onlyIfFinished = true,
  }: {
    sdocId: number;
    onlyIfFinished?: boolean;
  }): CancelablePromise<SourceDocumentDataRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/data/{sdoc_id}",
      path: {
        sdoc_id: sdocId,
      },
      query: {
        only_if_finished: onlyIfFinished,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the ids of SourceDocuments in the same folder as the SourceDocument with the given id.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getSameFolderSdocs({ sdocId }: { sdocId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/same_folder",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the URL to the original file of the SourceDocument with the given ID if it exists.
   * @returns string Successful Response
   * @throws ApiError
   */
  public static getFileUrl({
    sdocId,
    relative = true,
    webp = false,
    thumbnail = false,
  }: {
    sdocId: number;
    relative?: boolean;
    webp?: boolean;
    thumbnail?: boolean;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/url",
      path: {
        sdoc_id: sdocId,
      },
      query: {
        relative: relative,
        webp: webp,
        thumbnail: thumbnail,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns IDs of users that annotated that SourceDocument.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getAnnotators({ sdocId }: { sdocId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdoc/{sdoc_id}/annotators",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Metadata with the given ID.
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static getById6({ metadataId }: { metadataId: number }): CancelablePromise<SourceDocumentMetadataRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdocmeta/{metadata_id}",
      path: {
        metadata_id: metadataId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Metadata with the given ID.
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static updateById5({
    metadataId,
    requestBody,
  }: {
    metadataId: number;
    requestBody: SourceDocumentMetadataUpdate;
  }): CancelablePromise<SourceDocumentMetadataRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sdocmeta/{metadata_id}",
      path: {
        metadata_id: metadataId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the Metadata with the given ID.
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static deleteById6({ metadataId }: { metadataId: number }): CancelablePromise<SourceDocumentMetadataRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/sdocmeta/{metadata_id}",
      path: {
        metadata_id: metadataId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SourceDocumentMetadata of the SourceDocument with the given ID if it exists
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static getBySdoc({ sdocId }: { sdocId: number }): CancelablePromise<Array<SourceDocumentMetadataRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdocmeta/sdoc/{sdoc_id}",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the SourceDocumentMetadata with the given Key if it exists.
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static getBySdocAndKey({
    sdocId,
    metadataKey,
  }: {
    sdocId: number;
    metadataKey: string;
  }): CancelablePromise<SourceDocumentMetadataRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/sdocmeta/sdoc/{sdoc_id}/metadata/{metadata_key}",
      path: {
        sdoc_id: sdocId,
        metadata_key: metadataKey,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates multiple metadata objects at once.
   * @returns SourceDocumentMetadataRead Successful Response
   * @throws ApiError
   */
  public static updateBulk({
    requestBody,
  }: {
    requestBody: Array<SourceDocumentMetadataBulkUpdate>;
  }): CancelablePromise<Array<SourceDocumentMetadataRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/sdocmeta/bulk/update",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates a SpanAnnotation
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addSpanAnnotation({
    requestBody,
  }: {
    requestBody: SpanAnnotationCreate;
  }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/span",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates SpanAnnotations in Bulk
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addSpanAnnotationsBulk({
    requestBody,
  }: {
    requestBody: Array<SpanAnnotationCreate>;
  }): CancelablePromise<Array<SpanAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/span/bulk/create",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the SpanAnnotation with the given ID.
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getById7({ spanId }: { spanId: number }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/span/{span_id}",
      path: {
        span_id: spanId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the SpanAnnotation with the given ID.
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateById6({
    spanId,
    requestBody,
  }: {
    spanId: number;
    requestBody: SpanAnnotationUpdate;
  }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/span/{span_id}",
      path: {
        span_id: spanId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the SpanAnnotation with the given ID.
   * @returns SpanAnnotationDeleted Successful Response
   * @throws ApiError
   */
  public static deleteById7({ spanId }: { spanId: number }): CancelablePromise<SpanAnnotationDeleted> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/span/{span_id}",
      path: {
        span_id: spanId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SpanAnnotations of the User for the SourceDocument
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getBySdocAndUser2({
    sdocId,
    userId,
  }: {
    sdocId: number;
    userId: number;
  }): CancelablePromise<Array<SpanAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/span/sdoc/{sdoc_id}/user/{user_id}",
      path: {
        sdoc_id: sdocId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates SpanAnnotations in Bulk
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static updateSpanAnnotationsBulk({
    requestBody,
  }: {
    requestBody: Array<SpanAnnotationUpdateBulk>;
  }): CancelablePromise<Array<SpanAnnotationRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/span/bulk/update",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes all SpanAnnotations with the given IDs.
   * @returns SpanAnnotationDeleted Successful Response
   * @throws ApiError
   */
  public static deleteBulkById2({
    requestBody,
  }: {
    requestBody: Array<number>;
  }): CancelablePromise<Array<SpanAnnotationDeleted>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/span/bulk/delete",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SpanGroups that contain the the SpanAnnotation.
   * @returns SpanGroupRead Successful Response
   * @throws ApiError
   */
  public static getAllGroups({ spanId }: { spanId: number }): CancelablePromise<Array<SpanGroupRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/span/{span_id}/groups",
      path: {
        span_id: spanId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the SpanAnnotation from all SpanGroups
   * @returns SpanAnnotationDeleted Successful Response
   * @throws ApiError
   */
  public static removeFromAllGroups({ spanId }: { spanId: number }): CancelablePromise<SpanAnnotationDeleted> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/span/{span_id}/groups",
      path: {
        span_id: spanId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Adds the SpanAnnotation to the SpanGroup
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static addToGroup({
    spanId,
    groupId,
  }: {
    spanId: number;
    groupId: number;
  }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/span/{span_id}/group/{group_id}",
      path: {
        span_id: spanId,
        group_id: groupId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the SpanAnnotation from the SpanGroup
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static removeFromGroup({
    spanId,
    groupId,
  }: {
    spanId: number;
    groupId: number;
  }): CancelablePromise<SpanAnnotationRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/span/{span_id}/group/{group_id}",
      path: {
        span_id: spanId,
        group_id: groupId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns SpanAnnotations with the given Code of the logged-in User
   * @returns SpanAnnotationRead Successful Response
   * @throws ApiError
   */
  public static getByUserCode2({ codeId }: { codeId: number }): CancelablePromise<Array<SpanAnnotationRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/span/code/{code_id}/user",
      path: {
        code_id: codeId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Counts the SpanAnnotations of the User (by user_id) per Codes (by class_ids) in Documents (by sdoc_ids)
   * @returns number Successful Response
   * @throws ApiError
   */
  public static countAnnotations1({
    userId,
    requestBody,
  }: {
    userId: number;
    requestBody: Body_spanAnnotation_count_annotations;
  }): CancelablePromise<Record<string, number>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/span/count_annotations/{user_id}",
      path: {
        user_id: userId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Creates a new Tag and returns it with the generated ID.
   * @returns TagRead Successful Response
   * @throws ApiError
   */
  public static createNewDocTag({ requestBody }: { requestBody: TagCreate }): CancelablePromise<TagRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/tag",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Links multiple Tags with the SourceDocuments and returns the number of new Links
   * @returns number Successful Response
   * @throws ApiError
   */
  public static linkMultipleTags({
    requestBody,
  }: {
    requestBody: SourceDocumentTagMultiLink;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/tag/bulk/link",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Unlinks all Tags with the SourceDocuments and returns the number of removed Links.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static unlinkMultipleTags({
    requestBody,
  }: {
    requestBody: SourceDocumentTagMultiLink;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/tag/bulk/unlink",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Sets SourceDocuments' tags to the provided tags
   * @returns number Successful Response
   * @throws ApiError
   */
  public static setTagsBatch({
    requestBody,
  }: {
    requestBody: Array<SourceDocumentTagLinks>;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/tag/bulk/set",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates SourceDocuments' tags
   * @returns number Successful Response
   * @throws ApiError
   */
  public static updateTagsBatch({
    requestBody,
  }: {
    requestBody: Body_tag_update_tags_batch;
  }): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/tag/bulk/update",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the Tag with the given ID.
   * @returns TagRead Successful Response
   * @throws ApiError
   */
  public static getById8({ tagId }: { tagId: number }): CancelablePromise<TagRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/tag/{tag_id}",
      path: {
        tag_id: tagId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Tag with the given ID.
   * @returns TagRead Successful Response
   * @throws ApiError
   */
  public static updateById7({
    tagId,
    requestBody,
  }: {
    tagId: number;
    requestBody: TagUpdate;
  }): CancelablePromise<TagRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/tag/{tag_id}",
      path: {
        tag_id: tagId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Deletes the Tag with the given ID.
   * @returns TagRead Successful Response
   * @throws ApiError
   */
  public static deleteById8({ tagId }: { tagId: number }): CancelablePromise<TagRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/tag/{tag_id}",
      path: {
        tag_id: tagId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all Tags of the Project with the given ID
   * @returns TagRead Successful Response
   * @throws ApiError
   */
  public static getByProject2({ projId }: { projId: number }): CancelablePromise<Array<TagRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/tag/project/{proj_id}",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all TagIDs linked with the SourceDocument.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getBySdoc1({ sdocId }: { sdocId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/tag/sdoc/{sdoc_id}",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all SourceDocument IDs attached to the Tag with the given ID if it exists.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getSdocIdsByTagId({ tagId }: { tagId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/tag/{tag_id}/sdocs",
      path: {
        tag_id: tagId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns a dict of all tag ids with their count of assigned source documents, counting only source documents in the given id list
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getSdocCounts({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<number>;
  }): CancelablePromise<Record<string, number>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/tag/sdoc_counts/{project_id}",
      path: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Counts the Tags of the User (by user_id) per Tags (by class_ids) in Documents (by sdoc_ids)
   * @returns number Successful Response
   * @throws ApiError
   */
  public static countTags({
    userId,
    requestBody,
  }: {
    userId: number;
    requestBody: Body_tag_count_tags;
  }): CancelablePromise<Record<string, number>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/tag/count_tags/{user_id}",
      path: {
        user_id: userId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the current (logged in) user
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static getMe(): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/me",
    });
  }
  /**
   * Returns the User with the given ID if it exists
   * @returns PublicUserRead Successful Response
   * @throws ApiError
   */
  public static getById9({ userId }: { userId: number }): CancelablePromise<PublicUserRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/by_id/{user_id}",
      path: {
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all Users of the Project with the given ID
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static getByProject3({ projId }: { projId: number }): CancelablePromise<Array<UserRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/{proj_id}/user",
      path: {
        proj_id: projId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Associates an existing User to the Project with the given ID if it exists
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static associateUserToProject({
    projId,
    requestBody,
  }: {
    projId: number;
    requestBody: ProjectAddUser;
  }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/user/{proj_id}/user",
      path: {
        proj_id: projId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns all Users that exist in the system
   * @returns PublicUserRead Successful Response
   * @throws ApiError
   */
  public static getAll({
    skip,
    limit,
  }: {
    /**
     * The number of elements to skip (offset)
     */
    skip?: number | null;
    /**
     * The maximum number of returned elements
     */
    limit?: number | null;
  }): CancelablePromise<Array<PublicUserRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/user/all",
      query: {
        skip: skip,
        limit: limit,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Removes the logged-in User
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static deleteMe(): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/user/",
    });
  }
  /**
   * Updates the logged-in User
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static updateMe({ requestBody }: { requestBody: UserUpdate }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/user/",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Dissociates the Users with the Project with the given ID if it exists
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static dissociateUserFromProject({
    projId,
    userId,
  }: {
    projId: number;
    userId: number;
  }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/user/{proj_id}/user/{user_id}",
      path: {
        proj_id: projId,
        user_id: userId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
