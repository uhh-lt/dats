/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_wordFrequency_word_frequency_analysis } from "@models/Body_wordFrequency_word_frequency_analysis";
import type { Body_wordFrequency_word_frequency_analysis_export } from "@models/Body_wordFrequency_word_frequency_analysis_export";
import type { ColumnInfo_WordFrequencyColumns_ } from "@models/ColumnInfo_WordFrequencyColumns_";
import type { WordFrequencyResult } from "@models/WordFrequencyResult";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class WordFrequencyService {
  /**
   * Returns WordFrequency Info.
   * @returns ColumnInfo_WordFrequencyColumns_ Successful Response
   * @throws ApiError
   */
  public static wordFrequencyAnalysisInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_WordFrequencyColumns_>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/projects/{project_id}/word-frequencies/info",
      path: {
        project_id: projectId,
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
   * Perform word frequency analysis.
   * @returns WordFrequencyResult Successful Response
   * @throws ApiError
   */
  public static wordFrequencyAnalysis({
    projectId,
    page,
    pageSize,
    requestBody,
  }: {
    projectId: number;
    page: number;
    pageSize: number;
    requestBody: Body_wordFrequency_word_frequency_analysis;
  }): CancelablePromise<WordFrequencyResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/word-frequencies/analysis",
      path: {
        project_id: projectId,
      },
      query: {
        page: page,
        page_size: pageSize,
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
   * Export the word frequency analysis.
   * @returns string Successful Response
   * @throws ApiError
   */
  public static wordFrequencyAnalysisExport({
    projectId,
    requestBody,
  }: {
    projectId: number;
    requestBody: Body_wordFrequency_word_frequency_analysis_export;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/projects/{project_id}/word-frequencies/export",
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
