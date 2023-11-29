/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { FilterExpression_TimelineAnalysisColumns_ } from "./FilterExpression_TimelineAnalysisColumns_";
import type { LogicalOperator } from "./LogicalOperator";

export type Filter_TimelineAnalysisColumns_ = {
  items: Array<FilterExpression_TimelineAnalysisColumns_ | Filter_TimelineAnalysisColumns_>;
  logic_operator: LogicalOperator;
};
