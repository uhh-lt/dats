/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ExportFormat } from "./ExportFormat";
import type { ExportJobType } from "./ExportJobType";
import type { SingleDocAllUserAnnotationsExportJobParams } from "./SingleDocAllUserAnnotationsExportJobParams";
import type { SingleDocSingleUserAnnotationsExportJobParams } from "./SingleDocSingleUserAnnotationsExportJobParams";
import type { SingleProjectAllDataExportJobParams } from "./SingleProjectAllDataExportJobParams";
import type { SingleProjectAllTagsExportJobParams } from "./SingleProjectAllTagsExportJobParams";
import type { SingleUserAllCodesExportJobParams } from "./SingleUserAllCodesExportJobParams";
import type { SingleUserAllDataExportJobParams } from "./SingleUserAllDataExportJobParams";
import type { SingleUserAllMemosExportJobParams } from "./SingleUserAllMemosExportJobParams";
import type { SingleUserLogbookExportJobParams } from "./SingleUserLogbookExportJobParams";

export type ExportJobParameters_Input = {
  /**
   * The type of the export job (what to export)
   */
  export_job_type: ExportJobType;
  /**
   * The format of the exported data.
   */
  export_format?: ExportFormat | null;
  /**
   * Specific parameters for the export job w.r.t it's type
   */
  specific_export_job_parameters:
    | SingleProjectAllDataExportJobParams
    | SingleProjectAllTagsExportJobParams
    | SingleUserAllDataExportJobParams
    | SingleUserAllCodesExportJobParams
    | SingleUserAllMemosExportJobParams
    | SingleUserLogbookExportJobParams
    | SingleDocAllUserAnnotationsExportJobParams
    | SingleDocSingleUserAnnotationsExportJobParams;
};
