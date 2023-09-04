/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { BackgroundJobStatus } from "./BackgroundJobStatus";
import type { PreprocessingJobPayload } from "./PreprocessingJobPayload";

export type PreprocessingJobRead = {
  /**
   * Status of the BackgroundJob
   */
  status?: BackgroundJobStatus;
  /**
   * ID of the BackgroundJob
   */
  id: string;
  /**
   * The ID of the Project for which the BackgroundJob is executed.
   */
  project_id: number;
  /**
   * Created timestamp of the BackgroundJob
   */
  created: string;
  /**
   * Updated timestamp of the BackgroundJob
   */
  updated: string;
  /**
   * Payloads of the PreprocessingJobs, i.e., documents to be preprocessed and imported to the project within this PreprocessingJob
   */
  payloads: Array<PreprocessingJobPayload>;
};
