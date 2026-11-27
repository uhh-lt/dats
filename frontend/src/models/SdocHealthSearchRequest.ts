/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocType } from "./DocType";
import type { SdocHealthSort } from "./SdocHealthSort";
export type SdocHealthSearchRequest = {
  /**
   * The document type whose statuses are searched
   */
  doctype: DocType;
  /**
   * Ordered sort expressions
   */
  sorts?: Array<SdocHealthSort>;
  /**
   * Zero-based page index
   */
  page_number?: number;
  /**
   * Number of rows per page
   */
  page_size?: number;
};
