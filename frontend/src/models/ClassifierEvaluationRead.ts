/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierClassMetrics } from "./ClassifierClassMetrics";
import type { ClassifierData } from "./ClassifierData";
export type ClassifierEvaluationRead = {
  /**
   * ID of the Classifier
   */
  classifier_id: number;
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
  /**
   * Evaluation data statistics
   */
  eval_data_stats: Array<ClassifierData>;
  /**
   * Per-class evaluation metrics (empty for older evaluations)
   */
  class_metrics?: Array<ClassifierClassMetrics>;
  /**
   * Confusion matrix of raw counts (rows = gold, columns = predicted), including the O (no-label) class. Parallel to confusion_matrix_class_ids. Empty for older evaluations.
   */
  confusion_matrix?: Array<Array<number>>;
  /**
   * Class IDs (tag or code) labeling the rows/columns of the confusion matrix. The O (no-label) class is represented by the id 0. Empty for older evaluations.
   */
  confusion_matrix_class_ids?: Array<number>;
  /**
   * ID of the Classifier Evaluation
   */
  id: number;
  /**
   * Creation timestamp of the classifier
   */
  created: string;
};
