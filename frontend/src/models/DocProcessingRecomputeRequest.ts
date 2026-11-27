/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProcessingSettings } from "./ProcessingSettings";
export type DocProcessingRecomputeRequest = {
  /**
   * The pipeline step to recompute
   */
  processing_step: string;
  /**
   * The SourceDocuments to recompute
   */
  sdoc_ids: Array<number>;
  /**
   * Processing settings
   */
  settings: ProcessingSettings;
};
