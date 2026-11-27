/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_similaritySearch_find_similar_images } from "@models/Body_similaritySearch_find_similar_images";
import type { Body_similaritySearch_find_similar_sentences } from "@models/Body_similaritySearch_find_similar_sentences";
import type { SimSearchImageHit } from "@models/SimSearchImageHit";
import type { SimSearchSentenceHit } from "@models/SimSearchSentenceHit";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SimilaritySearchService {
  /**
   * Returns similar sentences according to a textual or visual query.
   * @returns SimSearchSentenceHit Successful Response
   * @throws ApiError
   */
  public static findSimilarSentences({
    projectId,
    topK,
    threshold,
    requestBody,
  }: {
    projectId: number;
    topK: number;
    threshold: number;
    requestBody: Body_similaritySearch_find_similar_sentences;
  }): CancelablePromise<Array<SimSearchSentenceHit>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/similarity-search/sentences",
      path: {
        project_id: projectId,
      },
      query: {
        top_k: topK,
        threshold: threshold,
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
   * Returns similar images according to a textual or visual query.
   * @returns SimSearchImageHit Successful Response
   * @throws ApiError
   */
  public static findSimilarImages({
    projectId,
    topK,
    threshold,
    requestBody,
  }: {
    projectId: number;
    topK: number;
    threshold: number;
    requestBody: Body_similaritySearch_find_similar_images;
  }): CancelablePromise<Array<SimSearchImageHit>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/similarity-search/images",
      path: {
        project_id: projectId,
      },
      query: {
        top_k: topK,
        threshold: threshold,
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
