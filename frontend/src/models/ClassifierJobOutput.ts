/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierEvaluationOutput } from "./ClassifierEvaluationOutput";
import type { ClassifierInferenceOutput } from "./ClassifierInferenceOutput";
import type { ClassifierTask } from "./ClassifierTask";
import type { ClassifierTrainingOutput } from "./ClassifierTrainingOutput";
export type ClassifierJobOutput = {
  /**
   * The type of the ClassifierJob
   */
  task_type: ClassifierTask;
  /**
   * Specific outputs for the ClassifierJob w.r.t it's type
   */
  task_output: ClassifierTrainingOutput | ClassifierEvaluationOutput | ClassifierInferenceOutput;
};
