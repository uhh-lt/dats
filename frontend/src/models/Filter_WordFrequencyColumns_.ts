/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterExpression_WordFrequencyColumns_ } from "./FilterExpression_WordFrequencyColumns_";
import type { LogicalOperator } from "./LogicalOperator";
export type Filter_WordFrequencyColumns_ = {
  /**
   * Unique id of this node within the filter tree
   */
  id: string;
  /**
   * Child expressions and/or nested filter nodes
   */
  items: Array<FilterExpression_WordFrequencyColumns_ | Filter_WordFrequencyColumns_>;
  /**
   * How the child items are combined (and/or)
   */
  logic_operator: LogicalOperator;
};
