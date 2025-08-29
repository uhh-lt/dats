/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierEvaluationParams } from "./ClassifierEvaluationParams";
import type { ClassifierInferenceParams } from "./ClassifierInferenceParams";
import type { ClassifierModel } from "./ClassifierModel";
import type { ClassifierTask } from "./ClassifierTask";
import type { ClassifierTrainingParams } from "./ClassifierTrainingParams";
export type ClassifierJobInput = {
  /**
   * Project ID associated with the job
   */
  project_id: number;
  /**
   * The type of the Classifier Task
   */
  task_type: ClassifierTask;
  /**
   * The type of the Classifier Model
   */
  model_type: ClassifierModel;
  /**
   * Specific parameters for the ClassifierJob w.r.t it's type
   */
  task_parameters: ClassifierTrainingParams | ClassifierEvaluationParams | ClassifierInferenceParams;
};
