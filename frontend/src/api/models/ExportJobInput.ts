/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExportJobType } from "./ExportJobType";
import type { ExportSelectedBboxAnnotationsParams } from "./ExportSelectedBboxAnnotationsParams";
import type { ExportSelectedCotaParams } from "./ExportSelectedCotaParams";
import type { ExportSelectedMemosParams } from "./ExportSelectedMemosParams";
import type { ExportSelectedSdocsParams } from "./ExportSelectedSdocsParams";
import type { ExportSelectedSentenceAnnotationsParams } from "./ExportSelectedSentenceAnnotationsParams";
import type { ExportSelectedSpanAnnotationsParams } from "./ExportSelectedSpanAnnotationsParams";
import type { ExportSelectedTimelineAnalysesParams } from "./ExportSelectedTimelineAnalysesParams";
import type { ExportSelectedWhiteboardsParams } from "./ExportSelectedWhiteboardsParams";
export type ExportJobInput = {
  /**
   * Project ID associated with the job
   */
  project_id: number;
  /**
   * The type of the export job (what to export)
   */
  export_job_type: ExportJobType;
  /**
   * Specific parameters for the export job w.r.t it's type
   */
  specific_export_job_parameters:
    | (
        | ExportSelectedSdocsParams
        | ExportSelectedSpanAnnotationsParams
        | ExportSelectedSentenceAnnotationsParams
        | ExportSelectedBboxAnnotationsParams
        | ExportSelectedMemosParams
        | ExportSelectedWhiteboardsParams
        | ExportSelectedTimelineAnalysesParams
        | ExportSelectedCotaParams
      )
    | null;
};
