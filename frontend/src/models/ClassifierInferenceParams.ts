/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ClassifierInferenceParams = {
  /**
   * The type of the Classifier Task
   */
  task_type: string;
  /**
   * ID of the model to use for inference
   */
  classifier_id: number;
  /**
   * List of SourceDocument IDs to apply the classifier on
   */
  sdoc_ids: Array<number>;
  /**
   * Delete existing span/sent annotations or tags before creating new ones
   */
  delete_existing_work: boolean;
};
