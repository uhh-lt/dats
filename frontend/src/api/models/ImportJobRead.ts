/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ImportJobInput } from "./ImportJobInput";
import type { JobStatus } from "./JobStatus";
export type ImportJobRead = {
  /**
   * RQ job ID
   */
  job_id: string;
  /**
   * Type of the job
   */
  job_type: string;
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
  input: ImportJobInput;
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
