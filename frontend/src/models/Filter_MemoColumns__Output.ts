/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterExpression_MemoColumns_ } from "./FilterExpression_MemoColumns_";
import type { LogicalOperator } from "./LogicalOperator";
export type Filter_MemoColumns__Output = {
  /**
   * Unique id of this node within the filter tree
   */
  id: string;
  /**
   * Child expressions and/or nested filter nodes
   */
  items: Array<FilterExpression_MemoColumns_ | Filter_MemoColumns__Output>;
  /**
   * How the child items are combined (and/or)
   */
  logic_operator: LogicalOperator;
};
