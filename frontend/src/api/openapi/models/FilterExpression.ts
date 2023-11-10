/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { BooleanOperator } from "./BooleanOperator";
import type { DateOperator } from "./DateOperator";
import type { DBColumns } from "./DBColumns";
import type { IDListOperator } from "./IDListOperator";
import type { IDOperator } from "./IDOperator";
import type { ListOperator } from "./ListOperator";
import type { NumberOperator } from "./NumberOperator";
import type { StringOperator } from "./StringOperator";

export type FilterExpression = {
  column: DBColumns;
  project_metadata_id?: number;
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
