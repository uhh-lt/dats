/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DuplicateFinderInput } from "./DuplicateFinderInput";
import type { DuplicateFinderOutput } from "./DuplicateFinderOutput";
import type { JobStatus } from "./JobStatus";
export type DuplicateFinderJobRead = {
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
   * Input for the job
   */
  input: DuplicateFinderInput;
  /**
   * Output for the job
   */
  output?: DuplicateFinderOutput | null;
};
