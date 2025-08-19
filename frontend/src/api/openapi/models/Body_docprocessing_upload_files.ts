/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProcessingSettings } from "./ProcessingSettings";
export type Body_docprocessing_upload_files = {
  settings: ProcessingSettings;
  /**
   * File(s) that get uploaded and represented by the SourceDocument(s)
   */
  uploaded_files: Array<Blob>;
};
