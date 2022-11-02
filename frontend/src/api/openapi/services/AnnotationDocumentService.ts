/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationDocumentCreate } from "../models/AnnotationDocumentCreate";
import type { AnnotationDocumentRead } from "../models/AnnotationDocumentRead";
import type { BBoxAnnotationRead } from "../models/BBoxAnnotationRead";
import type { BBoxAnnotationReadResolvedCode } from "../models/BBoxAnnotationReadResolvedCode";
import type { SpanAnnotationRead } from "../models/SpanAnnotationRead";
import type { SpanAnnotationReadResolved } from "../models/SpanAnnotationReadResolved";
import type { SpanGroupRead } from "../models/SpanGroupRead";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class AnnotationDocumentService {
  /**
   * Creates an AnnotationDocument
   * Creates an AnnotationDocument
   * @returns AnnotationDocumentRead Successful Response
   * @throws ApiError
   */
  public static create({
    requestBody,
  }: {
    requestBody: AnnotationDocumentCreate;
  }): CancelablePromise<AnnotationDocumentRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/adoc",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the AnnotationDocument
   * Returns the AnnotationDocument with the given ID if it exists
   * @returns AnnotationDocumentRead Successful Response
   * @throws ApiError
   */
  public static getByAdocId({ adocId }: { adocId: number }): CancelablePromise<AnnotationDocumentRead> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/adoc/{adoc_id}",
      path: {
        adoc_id: adocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Removes the AnnotationDocument
   * Removes the AnnotationDocument with the given ID if it exists
   * @returns AnnotationDocumentRead Successful Response
   * @throws ApiError
   */
  public static deleteByAdocId({ adocId }: { adocId: number }): CancelablePromise<AnnotationDocumentRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/adoc/{adoc_id}",
      path: {
        adoc_id: adocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all SpanAnnotations in the AnnotationDocument
   * Returns all SpanAnnotations in the AnnotationDocument with the given ID if it exists
   * @returns any Successful Response
   * @throws ApiError
   */
  public static getAllSpanAnnotations({
    adocId,
    skip,
    limit,
    resolve = true,
    includeSentences = false,
  }: {
    adocId: number;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number;
    /**
     * The maximum number of returned elements
     */
    limit?: number;
    /**
     * If true, the current_code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
    /**
     * If true, the sentence span annotations are also returned
     */
    includeSentences?: boolean;
  }): CancelablePromise<Array<SpanAnnotationRead | SpanAnnotationReadResolved>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/adoc/{adoc_id}/span_annotations",
      path: {
        adoc_id: adocId,
      },
      query: {
        skip: skip,
        limit: limit,
        resolve: resolve,
        include_sentences: includeSentences,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Removes all SpanAnnotations in the AnnotationDocument
   * Removes all SpanAnnotations in the AnnotationDocument with the given ID if it exists
   * @returns number Successful Response
   * @throws ApiError
   */
  public static deleteAllSpanAnnotations({ adocId }: { adocId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/adoc/{adoc_id}/span_annotations",
      path: {
        adoc_id: adocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all BBoxAnnotations in the AnnotationDocument
   * Returns all BBoxAnnotations in the AnnotationDocument with the given ID if it exists
   * @returns any Successful Response
   * @throws ApiError
   */
  public static getAllBboxAnnotations({
    adocId,
    skip,
    limit,
    resolve = true,
  }: {
    adocId: number;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number;
    /**
     * The maximum number of returned elements
     */
    limit?: number;
    /**
     * If true, the current_code_id of the SpanAnnotation gets resolved and replaced by the respective Code entity
     */
    resolve?: boolean;
  }): CancelablePromise<Array<BBoxAnnotationRead | BBoxAnnotationReadResolvedCode>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/adoc/{adoc_id}/bbox_annotations",
      path: {
        adoc_id: adocId,
      },
      query: {
        skip: skip,
        limit: limit,
        resolve: resolve,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Removes all BBoxAnnotations in the AnnotationDocument
   * Removes all BBoxAnnotations in the AnnotationDocument with the given ID if it exists
   * @returns number Successful Response
   * @throws ApiError
   */
  public static deleteAllBboxAnnotations({ adocId }: { adocId: number }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/adoc/{adoc_id}/bbox_annotations",
      path: {
        adoc_id: adocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all SpanGroups in the AnnotationDocument
   * Returns all SpanGroups in the AnnotationDocument with the given ID if it exists
   * @returns SpanGroupRead Successful Response
   * @throws ApiError
   */
  public static getAllSpanGroups({
    adocId,
    skip,
    limit,
  }: {
    adocId: number;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number;
    /**
     * The maximum number of returned elements
     */
    limit?: number;
  }): CancelablePromise<Array<SpanGroupRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/adoc/{adoc_id}/span_groups",
      path: {
        adoc_id: adocId,
      },
      query: {
        skip: skip,
        limit: limit,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
