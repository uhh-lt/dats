/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierBaseModelOption } from "./ClassifierBaseModelOption";
import type { ClassifierTrainingDefaults } from "./ClassifierTrainingDefaults";
export type ClassifierInfo = {
  /**
   * Signal percentage below which training signal is weak
   */
  weak_signal_threshold: number;
  /**
   * Signal percentage above which training signal is strong
   */
  strong_signal_threshold: number;
  /**
   * Selectable transformer base models (span & document classification)
   */
  transformer_models: Array<ClassifierBaseModelOption>;
  /**
   * Selectable embedding base models (sentence classification)
   */
  embedding_models: Array<ClassifierBaseModelOption>;
  /**
   * Backend-configured defaults for classifier training
   */
  training_params: ClassifierTrainingDefaults;
};
