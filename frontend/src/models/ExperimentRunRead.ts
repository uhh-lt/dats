/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExperimentRunScores } from "./ExperimentRunScores";
import type { JobStatus } from "./JobStatus";
export type ExperimentRunRead = {
  /**
   * ID of the experiment of the run
   */
  experiment_id: number;
  /**
   * Name of the run, unique per experiment; the run writes into the virtual user <experiment name>-<run name>
   */
  name: string;
  /**
   * ID of the prompt version of the run: a version of the experiment's task whose codes equal the experiment's codes
   */
  prompt_version_id: number;
  /**
   * Large Language Model to run the prompt with
   */
  model: string;
  /**
   * ID of the run
   */
  id: number;
  /**
   * IDs of the documents the run ran on
   */
  sdoc_ids: Array<number>;
  /**
   * ID of the virtual user the run writes its annotations into
   */
  virtual_user_id: number;
  /**
   * ID of the user who started the run
   */
  user_id: number | null;
  /**
   * State of the run
   */
  status: JobStatus;
  /**
   * ID of the job of the run
   */
  job_id: string | null;
  /**
   * When the job of the run started
   */
  started: string | null;
  /**
   * When the job of the run ended
   */
  finished: string | null;
  /**
   * The stored agreement with the gold annotator, one entry per scoring; empty until the run finished
   */
  scores: Array<ExperimentRunScores>;
  /**
   * When the stored agreement was computed
   */
  scores_computed: string | null;
  /**
   * Created timestamp of the run
   */
  created: string;
  /**
   * Updated timestamp of the run
   */
  updated: string;
};
