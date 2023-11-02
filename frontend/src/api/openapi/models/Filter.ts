/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { FilterExpression } from "./FilterExpression";
import type { LogicalOperator } from "./LogicalOperator";

/**
 * A tree of column expressions for filtering on many database columns using various
 * comparisons.
 */
export type Filter = {
  items: Array<FilterExpression | Filter>;
  logic_operator: LogicalOperator;
};
