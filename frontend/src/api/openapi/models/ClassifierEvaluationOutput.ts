/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierData } from "./ClassifierData";
export type ClassifierEvaluationOutput = {
  task_type: string;
  /**
   * Evaluation data statistics
   */
  eval_data_stats: Array<ClassifierData>;
  /**
   * F1 score
   */
  f1: number;
  /**
   * Precision score
   */
  precision: number;
  /**
   * Recall score
   */
  recall: number;
  /**
   * Accuracy score
   */
  accuracy: number;
};
