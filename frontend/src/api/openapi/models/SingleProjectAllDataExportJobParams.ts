/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ExportJobType } from './ExportJobType';

export type SingleProjectAllDataExportJobParams = {
    /**
     * The ID of the Project to export from
     */
    project_id: number;
    /**
     * The type of the export job (what to export)
     */
    export_job_type?: ExportJobType;
};

