/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierData } from "./ClassifierData";
import type { ClassifierLoss } from "./ClassifierLoss";
export type ClassifierTrainingOutput = {
  task_type: string;
  /**
   * Training loss per step
   */
  train_loss: Array<ClassifierLoss>;
  /**
   * Training data statistics
   */
  train_data_stats: Array<ClassifierData>;
};
