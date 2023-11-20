/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { FilterExpression_SearchColumns_ } from "./FilterExpression_SearchColumns_";
import type { LogicalOperator } from "./LogicalOperator";

/**
 * A tree of column expressions for filtering on many database columns using various
 * comparisons.
 */
export type Filter_SearchColumns_ = {
  items: Array<FilterExpression_SearchColumns_ | Filter_SearchColumns_>;
  logic_operator: LogicalOperator;
};
