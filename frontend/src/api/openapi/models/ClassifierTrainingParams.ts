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
   * Name of the base model
   */
  base_name: string;
  /**
   * Name of the adapter to use (if any)
   */
  adapter_name: string | null;
  /**
   * List of class IDs to train on (tag or code)
   */
  class_ids: Array<number>;
  /**
   * List of user IDs to train on
   */
  user_ids: Array<number>;
  /**
   * List of Tag IDs to train on
   */
  tag_ids: Array<number>;
  /**
   * Number of epochs to train for
   */
  epochs: number;
  /**
   * Batch size to use for training
   */
  batch_size: number;
  /**
   * Whether to use early stopping
   */
  early_stopping: boolean;
  /**
   * Learning rate to use for training
   */
  learning_rate: number;
  /**
   * Weight decay to use for training
   */
  weight_decay: number;
  /**
   * Dropout rate to use in the model
   */
  dropout: number;
  /**
   * Whether to use BIO or IO tagging
   */
  is_bio: boolean;
};
