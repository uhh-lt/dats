/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocType } from "./DocType";
import type { ProcessingSettings } from "./ProcessingSettings";
export type TextLanguageDetectionJobInput_Input = {
  /**
   * Project ID associated with the job
   */
  project_id: number;
  /**
   * Processing settings
   */
  settings: ProcessingSettings;
  /**
   * SDoc ID
   */
  sdoc_id: number;
  html: string;
  text: string;
  doctype: DocType;
};
