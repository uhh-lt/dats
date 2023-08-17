/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { TableType } from "./TableType";

export type AnalysisTableRead = {
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
   * ID of the AnalysisTable
   */
  id: number;
  /**
   * Project the AnalysisTable belongs to
   */
  project_id: number;
  /**
   * User the AnalysisTable belongs to
   */
  user_id: number;
  /**
   * Created timestamp of the AnalysisTable
   */
  created: string;
  /**
   * Updated timestamp of the AnalysisTable
   */
  updated: string;
};
