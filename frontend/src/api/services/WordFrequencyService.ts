/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_word_frequency_word_frequency_analysis } from "../models/Body_word_frequency_word_frequency_analysis";
import type { Body_word_frequency_word_frequency_analysis_export } from "../models/Body_word_frequency_word_frequency_analysis_export";
import type { ColumnInfo_WordFrequencyColumns_ } from "../models/ColumnInfo_WordFrequencyColumns_";
import type { WordFrequencyRead } from "../models/WordFrequencyRead";
import type { WordFrequencyResult } from "../models/WordFrequencyResult";
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
      url: "/word_frequency/info/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
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
    requestBody: Body_word_frequency_word_frequency_analysis;
  }): CancelablePromise<WordFrequencyResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/word_frequency/analysis",
      query: {
        project_id: projectId,
        page: page,
        page_size: pageSize,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
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
    requestBody: Body_word_frequency_word_frequency_analysis_export;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/word_frequency/export",
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
   * Returns the SourceDocument's word frequencies with the given ID if it exists
   * @returns WordFrequencyRead Successful Response
   * @throws ApiError
   */
  public static getWordFrequencies({ sdocId }: { sdocId: number }): CancelablePromise<Array<WordFrequencyRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/word_frequency/sdoc/{sdoc_id}",
      path: {
        sdoc_id: sdocId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
