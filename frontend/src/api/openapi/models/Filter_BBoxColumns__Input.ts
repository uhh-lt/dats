/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterExpression_BBoxColumns_ } from "./FilterExpression_BBoxColumns_";
import type { LogicalOperator } from "./LogicalOperator";
export type Filter_BBoxColumns__Input = {
  id: string;
  items: Array<FilterExpression_BBoxColumns_ | Filter_BBoxColumns__Input>;
  logic_operator: LogicalOperator;
};
