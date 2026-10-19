/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { JobStatus } from "./JobStatus";
import type { LLMAssistantJobInput } from "./LLMAssistantJobInput";
import type { LLMAssistantJobOutput } from "./LLMAssistantJobOutput";
export type LlmAssistantJobRead = {
  /**
   * RQ job ID
   */
  job_id: string;
  /**
   * Type of the job
   */
  job_type: LlmAssistantJobRead.job_type;
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
  input: LLMAssistantJobInput;
  /**
   * Output for the job
   */
  output?: LLMAssistantJobOutput | null;
  /**
   * Created timestamp of the job
   */
  created: string;
  /**
   * Finished timestamp of the job
   */
  finished?: string | null;
};
export namespace LlmAssistantJobRead {
  /**
   * Type of the job
   */
  export enum job_type {
    LLM_ASSISTANT = "llm_assistant",
  }
}
