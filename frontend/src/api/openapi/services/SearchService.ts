/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { KeywordStat } from "../models/KeywordStat";
import type { MemoContentQuery } from "../models/MemoContentQuery";
import type { MemoTitleQuery } from "../models/MemoTitleQuery";
import type { PaginatedElasticSearchDocumentHits } from "../models/PaginatedElasticSearchDocumentHits";
import type { PaginatedMemoSearchResults } from "../models/PaginatedMemoSearchResults";
import type { SearchSDocsQueryParameters } from "../models/SearchSDocsQueryParameters";
import type { SimSearchImageHit } from "../models/SimSearchImageHit";
import type { SimSearchSentenceHit } from "../models/SimSearchSentenceHit";
import type { SourceDocumentContentQuery } from "../models/SourceDocumentContentQuery";
import type { SourceDocumentFilenameQuery } from "../models/SourceDocumentFilenameQuery";
import type { SpanEntityDocumentFrequencyResult } from "../models/SpanEntityDocumentFrequencyResult";
import type { SpanEntityFrequency } from "../models/SpanEntityFrequency";
import type { TagStat } from "../models/TagStat";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class SearchService {
  /**
   * Returns all SourceDocument IDs that match the query parameters.
   * Returns all SourceDocument Ids that match the query parameters.
   * @returns number Successful Response
   * @throws ApiError
   */
  public static searchSdocs({
    requestBody,
  }: {
    requestBody: SearchSDocsQueryParameters;
  }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sdoc",
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
   * @returns SpanEntityFrequency Successful Response
   * @throws ApiError
   */
  public static searchSpanEntityStats({
    requestBody,
  }: {
    requestBody: SearchSDocsQueryParameters;
  }): CancelablePromise<Array<SpanEntityFrequency>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/entity_stats",
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
   * @returns SpanEntityDocumentFrequencyResult Successful Response
   * @throws ApiError
   */
  public static searchEntityDocumentStats({
    requestBody,
  }: {
    requestBody: SearchSDocsQueryParameters;
  }): CancelablePromise<SpanEntityDocumentFrequencyResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/entity_document_stats",
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
    requestBody,
    sortByGlobal = false,
    topK = 50,
  }: {
    requestBody: SearchSDocsQueryParameters;
    sortByGlobal?: boolean;
    topK?: number;
  }): CancelablePromise<Array<KeywordStat>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/keyword_stats",
      query: {
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
  }: {
    requestBody: SearchSDocsQueryParameters;
  }): CancelablePromise<Array<TagStat>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/tag_stats",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns all SourceDocuments where the content matches the query via lexical search
   * Returns all SourceDocuments where the content matches the query via lexical search
   * @returns PaginatedElasticSearchDocumentHits Successful Response
   * @throws ApiError
   */
  public static searchSdocsByContentQuery({
    requestBody,
    skip,
    limit,
  }: {
    requestBody: SourceDocumentContentQuery;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number;
    /**
     * The maximum number of returned elements
     */
    limit?: number;
  }): CancelablePromise<PaginatedElasticSearchDocumentHits> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/lexical/sdoc/content",
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
   * Returns all SourceDocuments where the filename matches the query via lexical search
   * Returns all SourceDocuments where the filename matches the query via lexical search
   * @returns PaginatedElasticSearchDocumentHits Successful Response
   * @throws ApiError
   */
  public static searchSdocsByFilenameQuery({
    requestBody,
    skip,
    limit,
  }: {
    requestBody: SourceDocumentFilenameQuery;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number;
    /**
     * The maximum number of returned elements
     */
    limit?: number;
  }): CancelablePromise<PaginatedElasticSearchDocumentHits> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/lexical/sdoc/filename",
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
   * Returns similar sentence SpanAnnotation according to a textual or visual query.
   * Returns similar sentence SpanAnnotation according to a textual or visual query.
   * @returns SimSearchSentenceHit Successful Response
   * @throws ApiError
   */
  public static findSimilarSentences({
    projId,
    query,
    topK = 10,
  }: {
    projId: number;
    query: string | number;
    topK?: number;
  }): CancelablePromise<Array<SimSearchSentenceHit>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/simsearch/sentences",
      query: {
        proj_id: projId,
        query: query,
        top_k: topK,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns similar Image SourceDocuments according to a textual or visual query.
   * Returns similar Image SourceDocuments according to a textual or visual query.
   * @returns SimSearchImageHit Successful Response
   * @throws ApiError
   */
  public static findSimilarImages({
    projId,
    query,
    topK = 10,
  }: {
    projId: number;
    query: string | number;
    topK?: number;
  }): CancelablePromise<Array<SimSearchImageHit>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/simsearch/images",
      query: {
        proj_id: projId,
        query: query,
        top_k: topK,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
