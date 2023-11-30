/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { BackgroundJobStatus } from "./BackgroundJobStatus";
import type { ExportJobParameters_Output } from "./ExportJobParameters_Output";

export type ExportJobRead = {
  /**
   * Status of the ExportJob
   */
  status?: BackgroundJobStatus;
  /**
   * URL to download the results when done.
   */
  results_url?: string | null;
  /**
   * ID of the ExportJob
   */
  id: string;
  /**
   * The parameters of the export job that defines what to export!
   */
  parameters: ExportJobParameters_Output;
  /**
   * Created timestamp of the ExportJob
   */
  created: string;
};
