/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterExpression_SearchColumns_ } from "./FilterExpression_SearchColumns_";
import type { LogicalOperator } from "./LogicalOperator";
export type Filter_SearchColumns_ = {
  id: string;
  items: Array<FilterExpression_SearchColumns_ | Filter_SearchColumns_>;
  logic_operator: LogicalOperator;
};
