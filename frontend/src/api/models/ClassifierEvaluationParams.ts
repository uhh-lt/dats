/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ClassifierEvaluationParams = {
  task_type: string;
  /**
   * ID of the model to evaluate
   */
  classifier_id: number;
  /**
   * List of Tag IDs to evaluate on
   */
  tag_ids: Array<number>;
  /**
   * User IDs whose annotations serve as gold labels
   */
  user_ids: Array<number>;
};
