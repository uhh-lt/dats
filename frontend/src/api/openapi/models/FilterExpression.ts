/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { DBColumns } from "./DBColumns";
import type { IDOperator } from "./IDOperator";
import type { NumberOperator } from "./NumberOperator";
import type { StringOperator } from "./StringOperator";

export type FilterExpression = {
  column: DBColumns;
  operator: IDOperator | NumberOperator | StringOperator;
  value: string | number;
};
