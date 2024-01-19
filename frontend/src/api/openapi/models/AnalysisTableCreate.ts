/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { TableType } from "./TableType";

export type AnalysisTableCreate = {
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
  /**
   * Project the AnalysisTable belongs to
   */
  project_id: number;
  /**
   * User the AnalysisTable belongs to. Do not send any value for this field, it is automatically set by the backend.
   */
  user_id?: number | null;
};
