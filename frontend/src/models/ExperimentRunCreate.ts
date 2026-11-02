/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ExperimentRunCreate = {
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
};
