/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MemoContentQuery = {
  /**
   * The ID of the Project the Memo have to belong to.
   */
  proj_id: number;
  /**
   * The ID of the User the Memo have to belong to.
   */
  user_id: number;
  /**
   * If set (i.e. not NULL / NONE), only returns Memo that have the given starred status
   */
  starred?: boolean | null;
  /**
   * The query term to search within the content of the Memo
   */
  content_query: string;
};
