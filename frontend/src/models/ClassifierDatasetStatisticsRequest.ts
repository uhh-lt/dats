/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierModel } from "./ClassifierModel";
export type ClassifierDatasetStatisticsRequest = {
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
  /**
   * Classifier type whose dataset construction should be inspected. Document classifiers use tags as classes, while sentence and span classifiers use codes and selected annotators.
   */
  model: ClassifierModel;
  /**
   * Hugging Face base model selected for training. Span statistics use its tokenizer to align word annotations with model tokens; document and sentence statistics currently do not depend on it.
   */
  base_model_name: string;
  /**
   * Selected tag IDs for document classification or code IDs for sentence and span classification
   */
  class_ids: Array<number>;
};
