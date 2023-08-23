/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { BackgroundJobStatus } from './BackgroundJobStatus';
import type { DocType } from './DocType';

export type PreprocessingJobPayload = {
    /**
     * The ID of the Project.
     */
    project_id: number;
    /**
     * The filename of the document to be preprocessed.
     */
    filename: string;
    /**
     * The MIME type of the file.
     */
    mime_type: string;
    /**
     * The DocType of the file.
     */
    doc_type: DocType;
    /**
     * The current step in the preprocessing pipeline.
     */
    current_pipeline_step?: string;
    /**
     * The current status of the payload.
     */
    status?: BackgroundJobStatus;
    /**
     * The error message if the payload failed.
     */
    error_message?: string;
};

