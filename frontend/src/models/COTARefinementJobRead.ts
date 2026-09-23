/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { COTARefinementJobInput } from "./COTARefinementJobInput";
import type { JobStatus } from "./JobStatus";
export type COTARefinementJobRead = {
  /**
   * RQ job ID
   */
  job_id: string;
  /**
   * Type of the job
   */
  job_type: COTARefinementJobRead.job_type;
  /**
   * Project ID associated with the job
   */
  project_id: number;
  /**
   * Current status of the job
   */
  status: JobStatus;
  /**
   * Status message
   */
  status_message?: string | null;
  /**
   * Current step in the job process
   */
  current_step: number;
  /**
   * Total number of steps in the job process
   */
  steps: Array<string>;
  /**
   * Input for the job
   */
  input: COTARefinementJobInput;
  /**
   * Output for the job
   */
  output?: null;
  /**
   * Created timestamp of the job
   */
  created: string;
  /**
   * Finished timestamp of the job
   */
  finished?: string | null;
};
export namespace COTARefinementJobRead {
  /**
   * Type of the job
   */
  export enum job_type {
    COTA_REFINEMENT = "cota_refinement",
  }
}
