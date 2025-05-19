/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterExpression_SdocColumns_ } from "./FilterExpression_SdocColumns_";
import type { LogicalOperator } from "./LogicalOperator";
export type Filter_SdocColumns__Output = {
  id: string;
  items: Array<FilterExpression_SdocColumns_ | Filter_SdocColumns__Output>;
  logic_operator: LogicalOperator;
};
