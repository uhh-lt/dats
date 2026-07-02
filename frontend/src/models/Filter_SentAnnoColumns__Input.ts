/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterExpression_SentAnnoColumns_ } from "./FilterExpression_SentAnnoColumns_";
import type { LogicalOperator } from "./LogicalOperator";
export type Filter_SentAnnoColumns__Input = {
  id: string;
  items: Array<FilterExpression_SentAnnoColumns_ | Filter_SentAnnoColumns__Input>;
  logic_operator: LogicalOperator;
};
