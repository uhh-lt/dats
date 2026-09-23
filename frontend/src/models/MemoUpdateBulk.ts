/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MemoUpdateBulk = {
  /**
   * Title of the Memo
   */
  title?: string | null;
  /**
   * Optional Unicode emoji used as the Memo icon
   */
  icon?: string | null;
  /**
   * Textual content of the Memo
   */
  content?: string | null;
  /**
   * JSON content of the Memo
   */
  content_json?: string | null;
  /**
   * Favorite the Memo for the requesting user only. This is per-user state: it does not change the Memo for other users.
   */
  is_favorite?: boolean | null;
  /**
   * ID of the Memo to update
   */
  memo_id: number;
};
