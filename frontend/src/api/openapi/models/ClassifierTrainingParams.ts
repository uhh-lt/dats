/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ClassifierTrainingParams = {
  task_type: string;
  /**
   * Name of the model to train
   */
  classifier_name: string;
  /**
   * List of class IDs to train on (tag or code)
   */
  class_ids: Array<number>;
  /**
   * List of user IDs to train on
   */
  user_ids: Array<number>;
  /**
   * List of SourceDocument IDs to train on
   */
  sdoc_ids: Array<number>;
  /**
   * Number of epochs to train for
   */
  epochs: number;
  /**
   * Batch size to use for training
   */
  batch_size: number;
};
