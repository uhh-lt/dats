/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxColumns } from "./BBoxColumns";
import type { BooleanOperator } from "./BooleanOperator";
import type { DateOperator } from "./DateOperator";
import type { IDListOperator } from "./IDListOperator";
import type { IDOperator } from "./IDOperator";
import type { ListOperator } from "./ListOperator";
import type { NumberOperator } from "./NumberOperator";
import type { StringOperator } from "./StringOperator";
export type FilterExpression_BBoxColumns_ = {
  id: string;
  column: BBoxColumns | number;
  operator:
    | IDOperator
    | NumberOperator
    | StringOperator
    | IDListOperator
    | ListOperator
    | DateOperator
    | BooleanOperator;
  value: boolean | string | number | Array<string> | Array<Array<string>>;
};
