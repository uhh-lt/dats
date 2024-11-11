/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotatedImageResult } from "../models/AnnotatedImageResult";
import type { AnnotatedSegmentResult } from "../models/AnnotatedSegmentResult";
import type { AnnotationOccurrence } from "../models/AnnotationOccurrence";
import type { Body_analysis_annotated_images } from "../models/Body_analysis_annotated_images";
import type { Body_analysis_annotated_segments } from "../models/Body_analysis_annotated_segments";
import type { Body_analysis_code_frequencies } from "../models/Body_analysis_code_frequencies";
import type { Body_analysis_word_frequency_analysis } from "../models/Body_analysis_word_frequency_analysis";
import type { Body_analysis_word_frequency_analysis_export } from "../models/Body_analysis_word_frequency_analysis_export";
import type { CodeFrequency } from "../models/CodeFrequency";
import type { CodeOccurrence } from "../models/CodeOccurrence";
import type { ColumnInfo_BBoxColumns_ } from "../models/ColumnInfo_BBoxColumns_";
import type { ColumnInfo_SpanColumns_ } from "../models/ColumnInfo_SpanColumns_";
import type { ColumnInfo_WordFrequencyColumns_ } from "../models/ColumnInfo_WordFrequencyColumns_";
import type { SampledSdocsResults } from "../models/SampledSdocsResults";
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
   * @returns ColumnInfo_SpanColumns_ Successful Response
   * @throws ApiError
   */
  public static annotatedSegmentsInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_SpanColumns_>> {
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
    userId,
    requestBody,
    page,
    pageSize,
  }: {
    projectId: number;
    userId: number;
    requestBody: Body_analysis_annotated_segments;
    page?: number | null;
    pageSize?: number | null;
  }): CancelablePromise<AnnotatedSegmentResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/annotated_segments",
      query: {
        project_id: projectId,
        user_id: userId,
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
   * Returns AnnotationSegments Info.
   * @returns ColumnInfo_BBoxColumns_ Successful Response
   * @throws ApiError
   */
  public static annotatedImagesInfo({
    projectId,
  }: {
    projectId: number;
  }): CancelablePromise<Array<ColumnInfo_BBoxColumns_>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/annotated_images_info",
      query: {
        project_id: projectId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns AnnotatedImageResult.
   * @returns AnnotatedImageResult Successful Response
   * @throws ApiError
   */
  public static annotatedImages({
    projectId,
    userId,
    requestBody,
    page,
    pageSize,
  }: {
    projectId: number;
    userId: number;
    requestBody: Body_analysis_annotated_images;
    page?: number | null;
    pageSize?: number | null;
  }): CancelablePromise<AnnotatedImageResult> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/annotated_images",
      query: {
        project_id: projectId,
        user_id: userId,
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
   * Returns Tuple[num_sdocs_with_date_metadata, num_total_sdocs].
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
    requestBody: Body_analysis_word_frequency_analysis_export;
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/analysis/word_frequency_analysis_export",
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
}
