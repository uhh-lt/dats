/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FilterExpression_TimelineAnalysisColumns_ } from "./FilterExpression_TimelineAnalysisColumns_";
import type { LogicalOperator } from "./LogicalOperator";
export type Filter_TimelineAnalysisColumns__Input = {
  id: string;
  items: Array<FilterExpression_TimelineAnalysisColumns_ | Filter_TimelineAnalysisColumns__Input>;
  logic_operator: LogicalOperator;
};
