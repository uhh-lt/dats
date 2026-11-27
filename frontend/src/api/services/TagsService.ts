/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SourceDocumentTagChangeRequest } from "@models/SourceDocumentTagChangeRequest";
import type { SourceDocumentTagLinkRequest } from "@models/SourceDocumentTagLinkRequest";
import type { SourceDocumentTagLinksResult } from "@models/SourceDocumentTagLinksResult";
import type { SourceDocumentTagReplaceRequest } from "@models/SourceDocumentTagReplaceRequest";
import type { TagCountRequest } from "@models/TagCountRequest";
import type { TagCreate } from "@models/TagCreate";
import type { TagRead } from "@models/TagRead";
import type { TagUpdate } from "@models/TagUpdate";
import type { TagUpdateBulk } from "@models/TagUpdateBulk";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class TagsService {
  /**
   * Creates a new Tag and returns it with the generated ID.
   * @returns TagRead Successful Response
   * @throws ApiError
   */
  public static create({
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Links the Tags with the SourceDocuments and returns the resulting tags per document
   * @returns SourceDocumentTagLinksResult Successful Response
   * @throws ApiError
   */
  public static addSourceDocumentsBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: SourceDocumentTagLinkRequest;
  }): CancelablePromise<SourceDocumentTagLinksResult> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/projects/{project_id}/tags/bulk/source-documents",
      path: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Links and unlinks Tags of the SourceDocuments and returns the resulting tags per document
   * @returns SourceDocumentTagLinksResult Successful Response
   * @throws ApiError
   */
  public static updateSourceDocumentsBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: SourceDocumentTagChangeRequest;
  }): CancelablePromise<SourceDocumentTagLinksResult> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/tags/bulk/source-documents",
      path: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Unlinks the Tags from the SourceDocuments and returns the resulting tags per document
   * @returns SourceDocumentTagLinksResult Successful Response
   * @throws ApiError
   */
  public static removeSourceDocumentsBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: SourceDocumentTagLinkRequest;
  }): CancelablePromise<SourceDocumentTagLinksResult> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/projects/{project_id}/tags/bulk/source-documents",
      path: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the IDs of the SourceDocuments linked with the Tag.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static getSourceDocuments({
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Updates the Tags with the given IDs.
   * @returns TagRead Successful Response
   * @throws ApiError
   */
  public static updateBulk({
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
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Sets the Tags of each SourceDocument to the given Tags and returns the resulting tags per document
   * @returns SourceDocumentTagLinksResult Successful Response
   * @throws ApiError
   */
  public static replaceSourceDocumentsBulk({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: SourceDocumentTagReplaceRequest;
  }): CancelablePromise<SourceDocumentTagLinksResult> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/projects/{project_id}/tags/bulk/source-documents/replace",
      path: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
  /**
   * Counts per Tag how many of the SourceDocuments carry it, for the given Tags or all Tags of the Project
   * @returns number Successful Response
   * @throws ApiError
   */
  public static count({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: TagCountRequest;
  }): CancelablePromise<Record<string, number>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/tags/counts",
      path: {
        project_id: projectId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `The request breaks a rule of the domain`,
        403: `The user is no member of the project, or the feature is disabled`,
        404: `A path id, or an id the route reads, is not in the project`,
        409: `A body id violates a foreign key, or a value a unique constraint`,
        422: `Validation Error`,
      },
    });
  }
}
