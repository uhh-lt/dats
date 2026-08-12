/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierAveraging } from "./ClassifierAveraging";
export type ClassifierEvaluationParams = {
  /**
   * IDs of document tags that select the dataset's source documents
   */
  tag_ids: Array<number>;
  /**
   * IDs of annotators whose annotations should be used for sentence and span classification; ignored for document classification
   */
  user_ids: Array<number>;
  /**
   * Whether annotations of descendant codes should count toward their selected parent code; only applies to sentence and span classification
   */
  merge_children_into_parent: boolean;
  task_type: string;
  /**
   * ID of the model to evaluate
   */
  classifier_id: number;
  /**
   * Averaging strategy for evaluation metrics. If None, the model's stored training setting is used.
   */
  averaging?: ClassifierAveraging | null;
};
