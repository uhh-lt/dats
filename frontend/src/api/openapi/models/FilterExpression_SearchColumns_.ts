/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { BooleanOperator } from "./BooleanOperator";
import type { DateOperator } from "./DateOperator";
import type { IDListOperator } from "./IDListOperator";
import type { IDOperator } from "./IDOperator";
import type { ListOperator } from "./ListOperator";
import type { NumberOperator } from "./NumberOperator";
import type { SearchColumns } from "./SearchColumns";
import type { StringOperator } from "./StringOperator";

export type FilterExpression_SearchColumns_ = {
  column: SearchColumns | number;
  operator:
    | IDOperator
    | NumberOperator
    | StringOperator
    | IDListOperator
    | ListOperator
    | DateOperator
    | BooleanOperator;
  value: string | number | boolean | Array<string> | Array<Array<string>>;
};
