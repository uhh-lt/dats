/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_search_search_code_stats } from "../models/Body_search_search_code_stats";
import type { Body_search_search_sdocs_new } from "../models/Body_search_search_sdocs_new";
import type { ColumnInfo_SearchColumns_ } from "../models/ColumnInfo_SearchColumns_";
import type { KeywordStat } from "../models/KeywordStat";
import type { MemoContentQuery } from "../models/MemoContentQuery";
import type { MemoTitleQuery } from "../models/MemoTitleQuery";
import type { PaginatedMemoSearchResults } from "../models/PaginatedMemoSearchResults";
import type { SimSearchImageHit } from "../models/SimSearchImageHit";
import type { SimSearchQuery } from "../models/SimSearchQuery";
import type { SimSearchSentenceHit } from "../models/SimSearchSentenceHit";
import type { SpanEntityStat } from "../models/SpanEntityStat";
import type { TagStat } from "../models/TagStat";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class SearchService {
  /**
   * Returns Search Info.
   * Returns Search Info.
   * @returns ColumnInfo_SearchColumns_ Successful Response
   * @throws ApiError
   */
  public static searchSdocsNewInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_SearchColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sdoc_new_info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all SourceDocument IDs that match the query parameters.
   * Returns all SourceDocument Ids that match the query parameters.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static searchSdocsNew({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Body_search_search_sdocs_new;
  }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sdoc_new",
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
   * Returns SpanEntityStats for the given SourceDocuments.
   * Returns SpanEntityStats for the given SourceDocuments.
   * @returns SpanEntityStat Successful Response
   * @throws ApiError
   */
  public static searchCodeStats({
    codeId,
    requestBody,
    sortByGlobal = false,
  }: {
    codeId: number;
    requestBody: Body_search_search_code_stats;
    sortByGlobal?: boolean;
  }): CancelablePromise<Array<SpanEntityStat>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/code_stats",
      query: {
        code_id: codeId,
        sort_by_global: sortByGlobal,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns KeywordStats for the given SourceDocuments.
   * Returns KeywordStats for the given SourceDocuments.
   * @returns KeywordStat Successful Response
   * @throws ApiError
   */
  public static searchKeywordStats({
    projectId,
    requestBody,
    sortByGlobal = false,
    topK = 50,
  }: {
    projectId: number;
    requestBody: Array<number>;
    sortByGlobal?: boolean;
    topK?: number;
  }): CancelablePromise<Array<KeywordStat>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/keyword_stats",
      query: {
        project_id: projectId,
        sort_by_global: sortByGlobal,
        top_k: topK,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns TagStat for the given SourceDocuments.
   * Returns Stat for the given SourceDocuments.
   * @returns TagStat Successful Response
   * @throws ApiError
   */
  public static searchTagStats({
    requestBody,
    sortByGlobal = false,
  }: {
    requestBody: Array<number>;
    sortByGlobal?: boolean;
  }): CancelablePromise<Array<TagStat>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/tag_stats",
      query: {
        sort_by_global: sortByGlobal,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all Memos where the content matches the query via lexical search
   * Returns all Memos where the content matches the query via lexical search
   * @returns PaginatedMemoSearchResults Successful Response
   * @throws ApiError
   */
  public static searchMemosByContentQuery({
    requestBody,
    skip,
    limit,
  }: {
    requestBody: MemoContentQuery;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number;
    /**
     * The maximum number of returned elements
     */
    limit?: number;
  }): CancelablePromise<PaginatedMemoSearchResults> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/lexical/memo/content",
      query: {
        skip: skip,
        limit: limit,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all Memos where the title matches the query via lexical search
   * Returns all Memos where the title matches the query via lexical search
   * @returns PaginatedMemoSearchResults Successful Response
   * @throws ApiError
   */
  public static searchMemosByTitleQuery({
    requestBody,
    skip,
    limit,
  }: {
    requestBody: MemoTitleQuery;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number;
    /**
     * The maximum number of returned elements
     */
    limit?: number;
  }): CancelablePromise<PaginatedMemoSearchResults> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/lexical/memo/title",
      query: {
        skip: skip,
        limit: limit,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns similar sentences according to a textual or visual query.
   * Returns similar sentences according to a textual or visual query.
   * @returns SimSearchSentenceHit Successful Response
   * @throws ApiError
   */
  public static findSimilarSentences({
    requestBody,
  }: {
    requestBody: SimSearchQuery;
  }): CancelablePromise<Array<SimSearchSentenceHit>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/simsearch/sentences",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns similar images according to a textual or visual query.
   * Returns similar images according to a textual or visual query.
   * @returns SimSearchImageHit Successful Response
   * @throws ApiError
   */
  public static findSimilarImages({
    requestBody,
  }: {
    requestBody: SimSearchQuery;
  }): CancelablePromise<Array<SimSearchImageHit>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/simsearch/images",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
