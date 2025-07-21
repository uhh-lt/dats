/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CoreferenceResolutionParams } from "./CoreferenceResolutionParams";
import type { DocTagRecommendationParams } from "./DocTagRecommendationParams";
import type { DocumentEmbeddingParams } from "./DocumentEmbeddingParams";
import type { MLJobType } from "./MLJobType";
import type { QuotationAttributionParams } from "./QuotationAttributionParams";
import type { SentenceEmbeddingParams } from "./SentenceEmbeddingParams";
export type MLJobParameters_Input = {
  /**
   * The type of the MLJob
   */
  ml_job_type: MLJobType;
  /**
   * The ID of the Project to analyse
   */
  project_id: number;
  /**
   * Specific parameters for the MLJob w.r.t it's type
   */
  specific_ml_job_parameters:
    | (
        | QuotationAttributionParams
        | DocTagRecommendationParams
        | CoreferenceResolutionParams
        | DocumentEmbeddingParams
        | SentenceEmbeddingParams
      )
    | null;
};
