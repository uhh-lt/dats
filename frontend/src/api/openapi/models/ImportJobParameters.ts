/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ImportJobType } from "./ImportJobType";
export type ImportJobParameters = {
  /**
   * ID of the Project
   */
  proj_id: number;
  /**
   * ID of the User, who started the job.
   */
  user_id: number;
  /**
   * Filename of the csv or zip of csvs.
   */
  filename: string;
  /**
   * The type of the import job (what to import)
   */
  import_job_type: ImportJobType;
};
