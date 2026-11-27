/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocType } from "./DocType";
export type DocProcessingRetryRequest = {
  /**
   * The document type of the SourceDocuments
   */
  doctype: DocType;
  /**
   * The SourceDocuments to retry
   */
  sdoc_ids: Array<number>;
};
