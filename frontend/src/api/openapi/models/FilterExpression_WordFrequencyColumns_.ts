/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BooleanOperator } from "./BooleanOperator";
import type { DateOperator } from "./DateOperator";
import type { IDListOperator } from "./IDListOperator";
import type { IDOperator } from "./IDOperator";
import type { ListOperator } from "./ListOperator";
import type { NumberOperator } from "./NumberOperator";
import type { StringOperator } from "./StringOperator";
import type { WordFrequencyColumns } from "./WordFrequencyColumns";
export type FilterExpression_WordFrequencyColumns_ = {
  column: WordFrequencyColumns | number;
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
