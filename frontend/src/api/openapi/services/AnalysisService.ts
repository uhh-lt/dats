/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_analysis_code_frequencies } from "../models/Body_analysis_code_frequencies";
import type { CodeFrequency } from "../models/CodeFrequency";
import type { CodeOccurrence } from "../models/CodeOccurrence";
import type { Direction } from "../models/Direction";
import type { NgramResponse } from "../models/NgramResponse";
import type { Ngrams } from "../models/Ngrams";
import type { PaginatedElasticSearchKwicSnippets } from "../models/PaginatedElasticSearchKwicSnippets";
import type { SampledSdocsResults } from "../models/SampledSdocsResults";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class AnalysisService {
  /**
   * Returns all SourceDocument IDs that match the query parameters.
   * @returns CodeFrequency Successful Response
   * @throws ApiError
   */
  public static codeFrequencies({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Body_analysis_code_frequencies;
  }): CancelablePromise<Array<CodeFrequency>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/code_frequencies",
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
   * Returns all SourceDocument IDs that match the query parameters.
   * @returns CodeOccurrence Successful Response
   * @throws ApiError
   */
  public static codeOccurrences({
    projectId,
    codeId,
    returnChildren,
    requestBody,
  }: {
    projectId: number;
    codeId: number;
    returnChildren: boolean;
    requestBody: Array<number>;
  }): CancelablePromise<Array<CodeOccurrence>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/code_occurrences",
      query: {
        project_id: projectId,
        code_id: codeId,
        return_children: returnChildren,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns tuple[num_sdocs_with_date_metadata, num_total_sdocs].
   * @returns any[] Successful Response
   * @throws ApiError
   */
  public static countSdocsWithDateMetadata({
    projectId,
    dateMetadataId,
  }: {
    projectId: number;
    dateMetadataId: number;
  }): CancelablePromise<any[]> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/analysis/count_sdocs_with_date_metadata/{project_id}/metadata/{date_metadata_id}}",
      path: {
        project_id: projectId,
        date_metadata_id: dateMetadataId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Sample & Aggregate Source Documents by tags.
   * @returns SampledSdocsResults Successful Response
   * @throws ApiError
   */
  public static sampleSdocsByTags({
    projectId,
    n,
    frac,
    requestBody,
  }: {
    projectId: number;
    n: number;
    frac: number;
    requestBody: Array<Array<number>>;
  }): CancelablePromise<Array<SampledSdocsResults>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/sample_sdocs_by_tags",
      query: {
        project_id: projectId,
        n: n,
        frac: frac,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns KWIC search results. Sorting direction is to the left or right.
   * @returns PaginatedElasticSearchKwicSnippets Successful Response
   * @throws ApiError
   */
  public static searchSdocsKwic({
    projectId,
    searchQuery,
    window = 5,
    direction = "left",
    pageNumber = 1,
    pageSize = 10,
  }: {
    projectId: number;
    searchQuery: string;
    window?: number;
    direction?: Direction;
    pageNumber?: number;
    pageSize?: number;
  }): CancelablePromise<PaginatedElasticSearchKwicSnippets> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/kwic",
      query: {
        project_id: projectId,
        search_query: searchQuery,
        window: window,
        direction: direction,
        page_number: pageNumber,
        page_size: pageSize,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns most frequent ngrams in a project
   * @returns NgramResponse Successful Response
   * @throws ApiError
   */
  public static searchSdocsUnigrams({
    projectId,
    searchQuery = "",
    limit = 20,
    exact = false,
    ngrams = "2",
    ascending = false,
  }: {
    projectId: number;
    searchQuery?: string;
    limit?: number;
    exact?: boolean;
    ngrams?: Ngrams;
    ascending?: boolean;
  }): CancelablePromise<NgramResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/ngrams",
      query: {
        project_id: projectId,
        search_query: searchQuery,
        limit: limit,
        exact: exact,
        ngrams: ngrams,
        ascending: ascending,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
