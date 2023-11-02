/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnalysisConcept } from "../models/AnalysisConcept";
import type { AnnotatedSegment } from "../models/AnnotatedSegment";
import type { AnnotationOccurrence } from "../models/AnnotationOccurrence";
import type { Body_analysis_code_frequencies } from "../models/Body_analysis_code_frequencies";
import type { CodeFrequency } from "../models/CodeFrequency";
import type { CodeOccurrence } from "../models/CodeOccurrence";
import type { Filter } from "../models/Filter";
import type { TimelineAnalysisResult } from "../models/TimelineAnalysisResult";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class AnalysisService {
  /**
   * Returns all SourceDocument IDs that match the query parameters.
   * Returns all SourceDocument Ids that match the query parameters.
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
   * Returns all SourceDocument Ids that match the query parameters.
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
   * Returns AnnotationSegments.
   * Returns AnnotationSegments.
   * @returns AnnotatedSegment Successful Response
   * @throws ApiError
   */
  public static annotatedSegments({
    projectId,
    userId,
    requestBody,
  }: {
    projectId: number;
    userId: number;
    requestBody: Filter;
  }): CancelablePromise<Array<AnnotatedSegment>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/annotated_segments",
      query: {
        project_id: projectId,
        user_id: userId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Perform timeline analysis.
   * Perform timeline analysis.
   * @returns TimelineAnalysisResult Successful Response
   * @throws ApiError
   */
  public static timelineAnalysis({
    projectId,
    threshold,
    metadataKey,
    requestBody,
  }: {
    projectId: number;
    threshold: number;
    metadataKey: string;
    requestBody: Array<AnalysisConcept>;
  }): CancelablePromise<Array<TimelineAnalysisResult>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/timeline_analysis",
      query: {
        project_id: projectId,
        threshold: threshold,
        metadata_key: metadataKey,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
