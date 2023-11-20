/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { FilterExpression_TimelineAnalysisColumns_ } from "./FilterExpression_TimelineAnalysisColumns_";
import type { LogicalOperator } from "./LogicalOperator";

/**
 * A tree of column expressions for filtering on many database columns using various
 * comparisons.
 */
export type Filter_TimelineAnalysisColumns_ = {
  items: Array<FilterExpression_TimelineAnalysisColumns_ | Filter_TimelineAnalysisColumns_>;
  logic_operator: LogicalOperator;
};
