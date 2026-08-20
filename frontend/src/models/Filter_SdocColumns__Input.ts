/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterExpression_SdocColumns_ } from "./FilterExpression_SdocColumns_";
import type { LogicalOperator } from "./LogicalOperator";
export type Filter_SdocColumns__Input = {
  /**
   * Unique id of this node within the filter tree
   */
  id: string;
  /**
   * Child expressions and/or nested filter nodes
   */
  items: Array<FilterExpression_SdocColumns_ | Filter_SdocColumns__Input>;
  /**
   * How the child items are combined (and/or)
   */
  logic_operator: LogicalOperator;
};
