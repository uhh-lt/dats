/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JobStatus } from "./JobStatus";
import type { LLMJobInput_Output } from "./LLMJobInput_Output";
import type { LLMJobOutput } from "./LLMJobOutput";
export type LlmAssistantJobRead = {
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
  num_steps: number;
  /**
   * Input for the job
   */
  input: LLMJobInput_Output;
  /**
   * Output for the job
   */
  output?: LLMJobOutput | null;
};
