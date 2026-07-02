/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_simsearch_find_similar_images } from "../models/Body_simsearch_find_similar_images";
import type { Body_simsearch_find_similar_sentences } from "../models/Body_simsearch_find_similar_sentences";
import type { SimSearchImageHit } from "../models/SimSearchImageHit";
import type { SimSearchSentenceHit } from "../models/SimSearchSentenceHit";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class SimsearchService {
  /**
   * Returns similar sentences according to a textual or visual query.
   * @returns SimSearchSentenceHit Successful Response
   * @throws ApiError
   */
  public static findSimilarSentences({
    projId,
    topK,
    threshold,
    requestBody,
  }: {
    projId: number;
    topK: number;
    threshold: number;
    requestBody: Body_simsearch_find_similar_sentences;
  }): CancelablePromise<Array<SimSearchSentenceHit>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/simsearch/sentences",
      query: {
        proj_id: projId,
        top_k: topK,
        threshold: threshold,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
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
    projId,
    topK,
    threshold,
    requestBody,
  }: {
    projId: number;
    topK: number;
    threshold: number;
    requestBody: Body_simsearch_find_similar_images;
  }): CancelablePromise<Array<SimSearchImageHit>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/simsearch/images",
      query: {
        proj_id: projId,
        top_k: topK,
        threshold: threshold,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
