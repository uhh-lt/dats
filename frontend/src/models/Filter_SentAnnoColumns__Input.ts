/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterExpression_SentAnnoColumns_ } from "./FilterExpression_SentAnnoColumns_";
import type { LogicalOperator } from "./LogicalOperator";
export type Filter_SentAnnoColumns__Input = {
  /**
   * Unique id of this node within the filter tree
   */
  id: string;
  /**
   * Child expressions and/or nested filter nodes
   */
  items: Array<FilterExpression_SentAnnoColumns_ | Filter_SentAnnoColumns__Input>;
  /**
   * How the child items are combined (and/or)
   */
  logic_operator: LogicalOperator;
};
