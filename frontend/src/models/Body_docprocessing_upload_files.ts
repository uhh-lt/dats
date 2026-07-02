/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Body_docprocessing_upload_files = {
  /**
   * ProcessingSettings as JSON string
   */
  settings: string;
  /**
   * File(s) that get uploaded and represented by the SourceDocument(s)
   */
  uploaded_files: Array<Blob>;
};
