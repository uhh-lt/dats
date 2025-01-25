/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterExpression_SentAnnoColumns_ } from "./FilterExpression_SentAnnoColumns_";
import type { LogicalOperator } from "./LogicalOperator";
export type Filter_SentAnnoColumns_ = {
  id: string;
  items: Array<FilterExpression_SentAnnoColumns_ | Filter_SentAnnoColumns_>;
  logic_operator: LogicalOperator;
};
