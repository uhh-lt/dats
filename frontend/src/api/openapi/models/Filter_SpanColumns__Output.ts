/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterExpression_SpanColumns_ } from "./FilterExpression_SpanColumns_";
import type { LogicalOperator } from "./LogicalOperator";
export type Filter_SpanColumns__Output = {
  id: string;
  items: Array<FilterExpression_SpanColumns_ | Filter_SpanColumns__Output>;
  logic_operator: LogicalOperator;
};
