/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { FilterExpression_WordFrequencyColumns_ } from "./FilterExpression_WordFrequencyColumns_";
import type { LogicalOperator } from "./LogicalOperator";

/**
 * A tree of column expressions for filtering on many database columns using various
 * comparisons.
 */
export type Filter_WordFrequencyColumns_ = {
  items: Array<FilterExpression_WordFrequencyColumns_ | Filter_WordFrequencyColumns_>;
  logic_operator: LogicalOperator;
};
