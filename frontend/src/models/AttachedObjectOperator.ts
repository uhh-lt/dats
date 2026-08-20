/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Compares an attached object as a (type, id) pair.
 *
 * The column is a tuple ``(type_expr, id_expr)`` and the value is a two-element
 * list ``[type, id]`` (e.g. ``["tag", "5"]``). Filtering by the raw id alone is
 * meaningless because ids collide across entity types (tag 5, code 5, sdoc 5 are
 * different objects), so the type is always part of the comparison.
 */
export enum AttachedObjectOperator {
  ATTACHED_OBJECT_EQUALS = "ATTACHED_OBJECT_EQUALS",
  ATTACHED_OBJECT_NOT_EQUALS = "ATTACHED_OBJECT_NOT_EQUALS",
}
