/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ColumnExpression } from "./ColumnExpression";
import type { LogicalOperator } from "./LogicalOperator";

export type Filter = {
  items: Array<ColumnExpression | Filter>;
  operator: LogicalOperator;
};
