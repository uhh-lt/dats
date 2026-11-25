/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Body_tag_update_sdoc_tags_bulk = {
  /**
   * The SourceDocuments to change
   */
  sdoc_ids: Array<number>;
  /**
   * The Tags to link
   */
  link_tag_ids: Array<number>;
  /**
   * The Tags to unlink
   */
  unlink_tag_ids: Array<number>;
};
