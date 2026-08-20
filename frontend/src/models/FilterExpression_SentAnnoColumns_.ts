/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AttachedObjectOperator } from "./AttachedObjectOperator";
import type { AttachedObjectTypeOperator } from "./AttachedObjectTypeOperator";
import type { BooleanOperator } from "./BooleanOperator";
import type { DateOperator } from "./DateOperator";
import type { IDListOperator } from "./IDListOperator";
import type { IDListRecursiveOperator } from "./IDListRecursiveOperator";
import type { IDOperator } from "./IDOperator";
import type { ListOperator } from "./ListOperator";
import type { NumberOperator } from "./NumberOperator";
import type { SentAnnoColumns } from "./SentAnnoColumns";
import type { SpanAnnotationOperator } from "./SpanAnnotationOperator";
import type { StringOperator } from "./StringOperator";
export type FilterExpression_SentAnnoColumns_ = {
  /**
   * Unique id of this expression within the filter tree
   */
  id: string;
  /**
   * The column to filter on: an enum member, or an int id referring to a project-metadata column
   */
  column: SentAnnoColumns | number;
  /**
   * The comparison operator applied to the column
   */
  operator:
    | IDOperator
    | NumberOperator
    | StringOperator
    | IDListOperator
    | IDListRecursiveOperator
    | ListOperator
    | DateOperator
    | BooleanOperator
    | AttachedObjectTypeOperator
    | AttachedObjectOperator
    | SpanAnnotationOperator;
  /**
   * The value the column is compared against
   */
  value: boolean | string | number | Array<string> | Array<Array<string>>;
};
