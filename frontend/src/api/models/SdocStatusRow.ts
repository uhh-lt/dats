/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SDocStatus } from "./SDocStatus";
export type SdocStatusRow = {
  /**
   * ID of the SourceDocument
   */
  sdoc_id: number;
  /**
   * Name of the SourceDocument
   */
  name: string;
  /**
   * Processing status of the SourceDocument (the keys are the processing step/job and differ per doctype)
   */
  status: Record<string, SDocStatus>;
  /**
   * UUIDs of the failed processing jobs (the keys are the processing step/job and differ per doctype)
   */
  failed_job_uuids: Record<string, string>;
  /**
   * Status messages of the failed processing jobs (the keys are the processing step/job and differ per doctype)
   */
  failed_job_status_msgs: Record<string, string>;
};
