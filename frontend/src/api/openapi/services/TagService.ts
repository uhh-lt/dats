/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_tag_count_tags } from "../models/Body_tag_count_tags";
import type { Body_tag_update_tags_batch } from "../models/Body_tag_update_tags_batch";
import type { SourceDocumentTagLinks } from "../models/SourceDocumentTagLinks";
import type { SourceDocumentTagMultiLink } from "../models/SourceDocumentTagMultiLink";
import type { TagCreate } from "../models/TagCreate";
import type { TagRead } from "../models/TagRead";
import type { TagUpdate } from "../models/TagUpdate";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class TagService {
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
  public static getById({ tagId }: { tagId: number }): CancelablePromise<TagRead> {
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
  public static updateById({
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
  public static deleteById({ tagId }: { tagId: number }): CancelablePromise<TagRead> {
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
  public static getByProject({ projId }: { projId: number }): CancelablePromise<Array<TagRead>> {
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
  public static getBySdoc({ sdocId }: { sdocId: number }): CancelablePromise<Array<number>> {
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
      url: "/tag/sdoc_counts",
      query: {
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
}
