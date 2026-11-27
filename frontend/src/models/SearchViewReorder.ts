/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SearchEntityType } from "./SearchEntityType";
export type SearchViewReorder = {
  /**
   * The entity type whose SearchViews are reordered
   */
  entity_type: SearchEntityType;
  /**
   * IDs of the user's SearchViews in their new order
   */
  view_ids: Array<number>;
};
