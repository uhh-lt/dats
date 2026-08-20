/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterExpression_SpanColumns_ } from "./FilterExpression_SpanColumns_";
import type { LogicalOperator } from "./LogicalOperator";
export type Filter_SpanColumns__Output = {
  /**
   * Unique id of this node within the filter tree
   */
  id: string;
  /**
   * Child expressions and/or nested filter nodes
   */
  items: Array<FilterExpression_SpanColumns_ | Filter_SpanColumns__Output>;
  /**
   * How the child items are combined (and/or)
   */
  logic_operator: LogicalOperator;
};
