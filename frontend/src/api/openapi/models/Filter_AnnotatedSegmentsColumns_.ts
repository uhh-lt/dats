/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { FilterExpression_AnnotatedSegmentsColumns_ } from "./FilterExpression_AnnotatedSegmentsColumns_";
import type { LogicalOperator } from "./LogicalOperator";

/**
 * A tree of column expressions for filtering on many database columns using various
 * comparisons.
 */
export type Filter_AnnotatedSegmentsColumns_ = {
  items: Array<FilterExpression_AnnotatedSegmentsColumns_ | Filter_AnnotatedSegmentsColumns_>;
  logic_operator: LogicalOperator;
};
