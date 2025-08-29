/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierData } from "./ClassifierData";
import type { ClassifierLoss } from "./ClassifierLoss";
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
   * Evaluation loss per step
   */
  eval_loss: Array<ClassifierLoss>;
  /**
   * Evaluation data statistics
   */
  eval_data_stats: Array<ClassifierData>;
  /**
   * ID of the Classifier Evaluation
   */
  id: number;
  /**
   * Creation timestamp of the classifier
   */
  created: string;
};
