/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierAveraging } from "./ClassifierAveraging";
export type ClassifierTrainingDefaults = {
  /**
   * Default adapter to use, or null to train without an adapter
   */
  adapter_name: string | null;
  /**
   * Default number of training epochs
   */
  epochs: number;
  /**
   * Default training batch size
   */
  batch_size: number;
  /**
   * Whether early stopping is enabled
   */
  early_stopping: boolean;
  /**
   * Default validation patience for early stopping
   */
  early_stopping_patience: number;
  /**
   * Default fraction of training data reserved for validation
   */
  train_test_split: number;
  /**
   * Default learning rate
   */
  learning_rate: number;
  /**
   * Default weight decay
   */
  weight_decay: number;
  /**
   * Default dropout rate
   */
  dropout: number;
  /**
   * Default token chunk size
   */
  chunk_size: number;
  /**
   * Default Lightning training precision
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
   * Default evaluation metric averaging strategy
   */
  averaging: ClassifierAveraging;
};
