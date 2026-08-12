/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierAveraging } from "./ClassifierAveraging";
export type ClassifierTrainingSettings = {
  /**
   * Whether to train with a LoRA adapter
   */
  lora_enabled: boolean;
  /**
   * Rank of the LoRA update matrices
   */
  lora_rank: number;
  /**
   * Scaling factor applied to LoRA updates
   */
  lora_alpha: number;
  /**
   * Dropout probability applied inside LoRA layers
   */
  lora_dropout: number;
  /**
   * Freeze pretrained base-model weights. Without LoRA, only classifier layers are trained; LoRA requires this setting
   */
  freeze_base_model: boolean;
  /**
   * Number of training epochs
   */
  epochs: number;
  /**
   * Training batch size
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
   * Peak learning rate for the pretrained base model
   */
  base_learning_rate: number;
  /**
   * Peak learning rate for the classifier head and, when enabled, LoRA adapter parameters
   */
  head_learning_rate: number;
  /**
   * Fraction of optimizer steps used to increase each learning rate linearly from zero to its peak before linear decay
   */
  warmup_fraction: number;
  /**
   * Weight decay
   */
  weight_decay: number;
  /**
   * Model dropout rate
   */
  dropout: number;
  /**
   * Token chunk size
   */
  chunk_size: number;
  /**
   * Lightning training precision
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
   * Evaluation metric averaging strategy
   */
  averaging: ClassifierAveraging;
};
