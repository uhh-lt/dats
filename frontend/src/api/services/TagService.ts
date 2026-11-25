/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_tag_count_tags } from "@models/Body_tag_count_tags";
import type { Body_tag_update_sdoc_tags_bulk } from "@models/Body_tag_update_sdoc_tags_bulk";
import type { SdocTagLinks } from "@models/SdocTagLinks";
import type { SourceDocumentTagMultiLink } from "@models/SourceDocumentTagMultiLink";
import type { TagCreate } from "@models/TagCreate";
import type { TagRead } from "@models/TagRead";
import type { TagUpdate } from "@models/TagUpdate";
import type { TagUpdateBulk } from "@models/TagUpdateBulk";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class TagService {
  /**
   * Creates a new Tag and returns it with the generated ID.
   * @returns TagRead Successful Response
   * @throws ApiError
   */
  public static createTag({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: TagCreate;
  }): CancelablePromise<TagRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/tags",
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
   * Returns the Tags of the Project, optionally only those of the SourceDocument
   * @returns TagRead Successful Response
   * @throws ApiError
   */
  public static getByProject({
    projectId,
    sdocId,
  }: {
    projectId: number;
    sdocId?: number | null;
  }): CancelablePromise<Array<TagRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/tags",
      path: {
        project_id: projectId,
      },
      query: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Links the Tags with the SourceDocuments and returns the resulting tags per document
   * @returns SdocTagLinks Successful Response
   * @throws ApiError
   */
  public static linkTagsBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: SourceDocumentTagMultiLink;
  }): CancelablePromise<SdocTagLinks> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/tags/bulk/source-documents",
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
   * Links and unlinks Tags of the SourceDocuments and returns the resulting tags per document
   * @returns SdocTagLinks Successful Response
   * @throws ApiError
   */
  public static updateSdocTagsBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Body_tag_update_sdoc_tags_bulk;
  }): CancelablePromise<SdocTagLinks> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/tags/bulk/source-documents",
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
   * Unlinks the Tags from the SourceDocuments and returns the resulting tags per document
   * @returns SdocTagLinks Successful Response
   * @throws ApiError
   */
  public static unlinkTagsBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: SourceDocumentTagMultiLink;
  }): CancelablePromise<SdocTagLinks> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/tags/bulk/source-documents",
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
   * Returns the Tag with the given ID.
   * @returns TagRead Successful Response
   * @throws ApiError
   */
  public static getById({ projectId, tagId }: { projectId: number; tagId: number }): CancelablePromise<TagRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/tags/{tag_id}",
      path: {
        project_id: projectId,
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
    projectId,
    tagId,
    requestBody,
  }: {
    projectId: number;
    tagId: number;
    requestBody: TagUpdate;
  }): CancelablePromise<TagRead> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/tags/{tag_id}",
      path: {
        project_id: projectId,
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
  public static deleteById({ projectId, tagId }: { projectId: number; tagId: number }): CancelablePromise<TagRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/tags/{tag_id}",
      path: {
        project_id: projectId,
        tag_id: tagId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the IDs of the SourceDocuments linked with the Tag.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getSdocIdsByTagId({
    projectId,
    tagId,
  }: {
    projectId: number;
    tagId: number;
  }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/tags/{tag_id}/source-documents",
      path: {
        project_id: projectId,
        tag_id: tagId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Tags with the given IDs.
   * @returns TagRead Successful Response
   * @throws ApiError
   */
  public static updateTagsBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Array<TagUpdateBulk>;
  }): CancelablePromise<Array<TagRead>> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/tags/bulk",
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
   * Sets the Tags of each SourceDocument to the given Tags and returns the resulting tags per document
   * @returns SdocTagLinks Successful Response
   * @throws ApiError
   */
  public static setSdocTagsBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: SdocTagLinks;
  }): CancelablePromise<SdocTagLinks> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/tags/bulk/source-documents/set",
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
   * Counts per Tag how many of the SourceDocuments carry it, for the given Tags or all Tags of the Project
   * @returns number Successful Response
   * @throws ApiError
   */
  public static countTags({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Body_tag_count_tags;
  }): CancelablePromise<Record<string, number>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/tags/count",
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
}
