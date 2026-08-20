/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SdocColumns } from "./SdocColumns";
import type { SortDirection } from "./SortDirection";
export type Sort_SdocColumns_ = {
  /**
   * The column to sort by: an enum member, or an int id referring to a project-metadata column
   */
  column: SdocColumns | number;
  /**
   * Sort direction (asc/desc)
   */
  direction: SortDirection;
};
