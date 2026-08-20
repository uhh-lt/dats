/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * One group: its key, display label, member count, and optional target.
 */
export type GroupSummary = {
  /**
   * Stable identity of the group (an id, date bucket, first letter, or boolean). Defines the partition — grouping is always by key, never by label. The frontend sends this back as `group_key` to drill into the group.
   */
  key: string;
  /**
   * Human-readable name shown as the group header. Functionally dependent on `key`; used for display and alphabetical ordering.
   */
  label: string;
  /**
   * Number of rows in this group
   */
  total_results: number;
  /**
   * ID of the object this group points to (for drill-down navigation), if the group corresponds to a navigable object.
   */
  target_id?: number | null;
  /**
   * Type of the target object (an AttachedObjectType), if set.
   */
  target_type?: string | null;
};
