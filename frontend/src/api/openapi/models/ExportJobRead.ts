/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ExportJobParameters } from "./ExportJobParameters";
import type { ExportJobStatus } from "./ExportJobStatus";

export type ExportJobRead = {
  /**
   * Status of the ExportJob
   */
  status?: ExportJobStatus;
  /**
   * URL to download the results when done.
   */
  results_url?: string;
  /**
   * ID of the ExportJob
   */
  id: string;
  /**
   * The parameters of the export job that defines what to export!
   */
  parameters: ExportJobParameters;
  /**
   * Created timestamp of the ExportJob
   */
  created: string;
};