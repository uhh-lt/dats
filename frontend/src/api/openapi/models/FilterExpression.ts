/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ArrayOperator } from "./ArrayOperator";
import type { DBColumns } from "./DBColumns";
import type { IDOperator } from "./IDOperator";
import type { NumberOperator } from "./NumberOperator";
import type { StringOperator } from "./StringOperator";

export type FilterExpression = {
  column: DBColumns;
  metadata_key?: string;
  operator: IDOperator | NumberOperator | StringOperator | ArrayOperator;
  value: string | number;
};
