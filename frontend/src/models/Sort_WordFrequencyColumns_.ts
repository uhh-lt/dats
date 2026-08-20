/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SortDirection } from "./SortDirection";
import type { WordFrequencyColumns } from "./WordFrequencyColumns";
export type Sort_WordFrequencyColumns_ = {
  /**
   * The column to sort by: an enum member, or an int id referring to a project-metadata column
   */
  column: WordFrequencyColumns | number;
  /**
   * Sort direction (asc/desc)
   */
  direction: SortDirection;
};
