/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotatedSegmentResult } from "../models/AnnotatedSegmentResult";
import type { AnnotationOccurrence } from "../models/AnnotationOccurrence";
import type { Body_analysis_annotated_segments } from "../models/Body_analysis_annotated_segments";
import type { Body_analysis_code_frequencies } from "../models/Body_analysis_code_frequencies";
import type { Body_analysis_word_frequency_analysis } from "../models/Body_analysis_word_frequency_analysis";
import type { CodeFrequency } from "../models/CodeFrequency";
import type { CodeOccurrence } from "../models/CodeOccurrence";
import type { ColumnInfo_AnnotatedSegmentsColumns_ } from "../models/ColumnInfo_AnnotatedSegmentsColumns_";
import type { ColumnInfo_TimelineAnalysisColumns_ } from "../models/ColumnInfo_TimelineAnalysisColumns_";
import type { ColumnInfo_WordFrequencyColumns_ } from "../models/ColumnInfo_WordFrequencyColumns_";
import type { DateGroupBy } from "../models/DateGroupBy";
import type { Filter_TimelineAnalysisColumns_ } from "../models/Filter_TimelineAnalysisColumns_";
import type { TimelineAnalysisResultNew } from "../models/TimelineAnalysisResultNew";
import type { WordFrequencyResult } from "../models/WordFrequencyResult";

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
    requestBody,
  }: {
    projectId: number;
    codeId: number;
    requestBody: Array<number>;
  }): CancelablePromise<Array<CodeOccurrence>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/code_occurrences",
      query: {
        project_id: projectId,
        code_id: codeId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns AnnotationOccurrences.
   * @returns AnnotationOccurrence Successful Response
   * @throws ApiError
   */
  public static annotationOccurrences({
    projectId,
    codeId,
    requestBody,
  }: {
    projectId: number;
    codeId: number;
    requestBody: Array<number>;
  }): CancelablePromise<Array<AnnotationOccurrence>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/annotation_occurrences",
      query: {
        project_id: projectId,
        code_id: codeId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns AnnotationSegments Info.
   * @returns ColumnInfo_AnnotatedSegmentsColumns_ Successful Response
   * @throws ApiError
   */
  public static annotatedSegmentsInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_AnnotatedSegmentsColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/annotated_segments_info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns AnnotationSegments.
   * @returns AnnotatedSegmentResult Successful Response
   * @throws ApiError
   */
  public static annotatedSegments({
    projectId,
    page,
    pageSize,
    requestBody,
  }: {
    projectId: number;
    page: number;
    pageSize: number;
    requestBody: Body_analysis_annotated_segments;
  }): CancelablePromise<AnnotatedSegmentResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/annotated_segments",
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
   * Returns TimelineAnalysis Info.
   * @returns any[] Successful Response
   * @throws ApiError
   */
  public static getTimelineAnalysisValidDocuments({
    projectId,
    dateMetadataId,
  }: {
    projectId: number;
    dateMetadataId: number;
  }): CancelablePromise<any[]> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/analysis/timeline_analysis_valid_docments/{project_id}/metadata/{date_metadata_id}}",
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
   * Returns TimelineAnalysis Info.
   * @returns ColumnInfo_TimelineAnalysisColumns_ Successful Response
   * @throws ApiError
   */
  public static timelineAnalysis2Info({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_TimelineAnalysisColumns_>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/analysis/timeline_analysis2_info/{project_id}",
      path: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Perform new timeline analysis.
   * @returns TimelineAnalysisResultNew Successful Response
   * @throws ApiError
   */
  public static timelineAnalysis2({
    projectId,
    groupBy,
    projectMetadataId,
    requestBody,
  }: {
    projectId: number;
    groupBy: DateGroupBy;
    projectMetadataId: number;
    requestBody: Filter_TimelineAnalysisColumns_;
  }): CancelablePromise<Array<TimelineAnalysisResultNew>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/timeline_analysis2",
      query: {
        project_id: projectId,
        group_by: groupBy,
        project_metadata_id: projectMetadataId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

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
      url: "/analysis/word_frequency_analysis_info/{project_id}",
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
    requestBody: Body_analysis_word_frequency_analysis;
  }): CancelablePromise<WordFrequencyResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/word_frequency_analysis",
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
}
