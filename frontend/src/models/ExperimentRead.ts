/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExperimentRunRead } from "./ExperimentRunRead";
import type { TaskType } from "./TaskType";
export type ExperimentRead = {
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
   * ID of the experiment
   */
  id: number;
  /**
   * Project the experiment belongs to
   */
  project_id: number;
  /**
   * ID of the gold annotator; null if the gold annotator was deleted, then the experiment keeps its runs and their scores, but cannot start runs or refresh scores
   */
  gold_user_id: number | null;
  /**
   * Created timestamp of the experiment
   */
  created: string;
  /**
   * Updated timestamp of the experiment
   */
  updated: string;
  /**
   * The runs of the experiment, in the order of creation
   */
  runs: Array<ExperimentRunRead>;
};
