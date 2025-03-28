/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ImportJobType } from "./ImportJobType";
export type ImportJobParameters = {
  /**
   * The type of the import job (what to import)
   */
  import_job_type: ImportJobType;
  /**
   * ID of the Project
   */
  project_id: number;
  /**
   * ID of the User, who started the job.
   */
  user_id: number;
  /**
   * The name to the file that is used for the import job
   */
  file_name: string;
};
