/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierData } from "./ClassifierData";
import type { ClassifierEvaluationRead } from "./ClassifierEvaluationRead";
import type { ClassifierLoss } from "./ClassifierLoss";
import type { ClassifierModel } from "./ClassifierModel";
export type ClassifierRead = {
  /**
   * ID of the project this classifier belongs to
   */
  project_id: number;
  /**
   * Name of the classifier
   */
  name: string;
  /**
   * Name of the base model
   */
  base_model: string;
  /**
   * Type of the classifier
   */
  type: ClassifierModel;
  /**
   * Name of the classifier
   */
  path: string;
  /**
   * Mapping from internal model label id to code/tag id, depending on ClassifierModel.
   */
  labelid2classid: Record<string, number>;
  /**
   * Batch size used for training
   */
  batch_size: number;
  /**
   * Number of epochs for training
   */
  epochs: number;
  /**
   * Training loss per step
   */
  train_loss: Array<ClassifierLoss>;
  /**
   * Training data stats
   */
  train_data_stats: Array<ClassifierData>;
  /**
   * ID of the Classifier
   */
  id: number;
  /**
   * Creation timestamp of the classifier
   */
  created: string;
  /**
   * Update timestamp of the classifier
   */
  updated: string;
  /**
   * List of class IDs the classifier was trained with (tag or code)
   */
  class_ids: Array<number>;
  /**
   * List of evaluations for the classifier
   */
  evaluations: Array<ClassifierEvaluationRead>;
};
