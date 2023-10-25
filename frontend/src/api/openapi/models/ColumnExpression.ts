/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CodeColumn } from "./CodeColumn";
import type { FieldOperator } from "./FieldOperator";
import type { ProjectColumn } from "./ProjectColumn";

export type ColumnExpression = {
  /**
   * Column to filter on
   */
  column: ProjectColumn | CodeColumn;
  /**
   * Operator to use
   */
  operator: FieldOperator;
  /**
   * Value to compare against
   */
  value: string;
};
