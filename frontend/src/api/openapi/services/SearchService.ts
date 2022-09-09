/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { KeywordStat } from "../models/KeywordStat";
import type { MemoContentQuery } from "../models/MemoContentQuery";
import type { MemoTitleQuery } from "../models/MemoTitleQuery";
import type { PaginatedMemoSearchResults } from "../models/PaginatedMemoSearchResults";
import type { PaginatedSourceDocumentSearchResults } from "../models/PaginatedSourceDocumentSearchResults";
import type { SearchSDocsQueryParameters } from "../models/SearchSDocsQueryParameters";
import type { SourceDocumentContentQuery } from "../models/SourceDocumentContentQuery";
import type { SourceDocumentFilenameQuery } from "../models/SourceDocumentFilenameQuery";
import type { SpanEntityStat } from "../models/SpanEntityStat";
import type { SpanEntityStatsQueryParameters } from "../models/SpanEntityStatsQueryParameters";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class SearchService {
  /**
   * Returns all SourceDocuments of the given Project that match the query parameters
   * Returns all SourceDocuments of the given Project with the given ID that match the query parameters
   * @returns number Successful Response
   * @throws ApiError
   */
  public static searchSdocsSearchSdocPost({
    requestBody,
    skip,
    limit = 100,
  }: {
    requestBody: SearchSDocsQueryParameters;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number;
    /**
     * The maximum number of returned elements
     */
    limit?: number;
  }): CancelablePromise<Array<number>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/sdoc",
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
   * Returns SpanEntityStats for the given SourceDocuments.
   * Returns SpanEntityStats for the given SourceDocuments.
   * @returns SpanEntityStat Successful Response
   * @throws ApiError
   */
  public static searchStatsSearchStatsPost({
    requestBody,
    skip,
    limit = 100,
  }: {
    requestBody: SpanEntityStatsQueryParameters;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number;
    /**
     * The maximum number of returned elements
     */
    limit?: number;
  }): CancelablePromise<Array<SpanEntityStat>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/stats",
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
   * Returns SpanEntityStats for the given SourceDocuments.
   * Returns SpanEntityStats for the given SourceDocuments.
   * @returns KeywordStat Successful Response
   * @throws ApiError
   */
  public static searchKeywordStatsSearchKeywordStatsPost({
    requestBody,
    skip,
    limit = 100,
  }: {
    requestBody: SpanEntityStatsQueryParameters;
    /**
     * The number of elements to skip (offset)
     */
    skip?: number;
    /**
     * The maximum number of returned elements
     */
    limit?: number;
  }): CancelablePromise<Array<KeywordStat>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/search/keyword_stats",
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
   * Returns all SourceDocuments where the content matches the query via lexical search
   * Returns all SourceDocuments where the content matches the query via lexical search
   * @returns PaginatedSourceDocumentSearchResults Successful Response
   * @throws ApiError
   */
  public static searchSdocsByContentQuerySearchLexicalSdocContentPost({
    requestBody,
    skip,
    limit = 100,
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
  }): CancelablePromise<PaginatedSourceDocumentSearchResults> {
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
   * @returns PaginatedSourceDocumentSearchResults Successful Response
   * @throws ApiError
   */
  public static searchSdocsByFilenameQuerySearchLexicalSdocFilenamePost({
    requestBody,
    skip,
    limit = 100,
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
  }): CancelablePromise<PaginatedSourceDocumentSearchResults> {
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
  public static searchMemosByContentQuerySearchLexicalMemoContentPost({
    requestBody,
    skip,
    limit = 100,
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
  public static searchMemosByTitleQuerySearchLexicalMemoTitlePost({
    requestBody,
    skip,
    limit = 100,
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
}
