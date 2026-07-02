/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierData } from "./ClassifierData";
export type ClassifierInferenceOutput = {
  task_type: string;
  /**
   * Statistics of the inference results
   */
  result_statistics: Array<ClassifierData>;
  /**
   * Number of SourceDocuments successfully affected by the classifier
   */
  total_affected_docs: number;
};
