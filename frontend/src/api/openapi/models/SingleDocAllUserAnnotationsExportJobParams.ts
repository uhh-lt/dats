/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ExportJobType } from './ExportJobType';

export type SingleDocAllUserAnnotationsExportJobParams = {
    /**
     * The ID of the Project to export from
     */
    project_id: number;
    /**
     * The type of the export job (what to export)
     */
    export_job_type?: ExportJobType;
    /**
     * The ID of the SDocument to get the data from.
     */
    sdoc_id: number;
};

