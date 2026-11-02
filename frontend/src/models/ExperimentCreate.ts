/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TaskType } from "./TaskType";
export type ExperimentCreate = {
  /**
   * Name of the experiment
   */
  name: string;
  /**
   * Task of the experiment: span or sentence annotation
   */
  task_type: TaskType;
  /**
   * IDs of the documents of the experiment
   */
  sdoc_ids: Array<number>;
  /**
   * IDs of the codes of the experiment
   */
  code_ids: Array<number>;
  /**
   * Project the experiment belongs to
   */
  project_id: number;
  /**
   * ID of the gold annotator, who must have annotated every document (filter 'Annotated by')
   */
  gold_user_id: number;
};
