/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocumentUnit } from "./DocumentUnit";
import type { OutputFormat } from "./OutputFormat";
export type OutputFormatInfo = {
  /**
   * The output format
   */
  output_format: OutputFormat;
  /**
   * The block, e.g. <output-format:inline>
   */
  placeholder: string;
  /**
   * Human-readable name of the format
   */
  name: string;
  /**
   * How the LLM answers in this format
   */
  description: string;
  /**
   * The document unit the format works best with
   */
  default_document_unit: DocumentUnit;
};
