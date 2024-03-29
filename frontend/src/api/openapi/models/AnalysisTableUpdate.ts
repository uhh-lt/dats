/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { TableType } from "./TableType";

export type AnalysisTableUpdate = {
  /**
   * Title of the AnalysisTable
   */
  title: string;
  /**
   * Content of the AnalysisTable
   */
  content: string;
  /**
   * TABLETYPE of the AnalysisTable
   */
  table_type: TableType;
};
