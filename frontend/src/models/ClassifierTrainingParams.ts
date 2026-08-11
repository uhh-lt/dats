/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierAveraging } from "./ClassifierAveraging";
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
   * Merge child codes in parent code?
   */
  merge_children_into_parent: boolean;
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
   * Number of validation epochs without improvement before stopping
   */
  early_stopping_patience: number;
  /**
   * Fraction of selected training data reserved for validation
   */
  train_test_split: number;
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
   * Slice long documents into chunks of size x
   */
  chunk_size: number;
  /**
   * Precision, e.g. 32-true, 16-mixed, 16-true, bf16-true, bf16-mixed
   */
  precision:
    | 64
    | 32
    | 16
    | "transformer-engine"
    | "transformer-engine-float16"
    | "16-true"
    | "16-mixed"
    | "bf16-true"
    | "bf16-mixed"
    | "32-true"
    | "64-true"
    | "64"
    | "32"
    | "16"
    | "bf16"
    | null;
  /**
   * Averaging strategy for evaluation metrics (micro or macro)
   */
  averaging: ClassifierAveraging;
};
