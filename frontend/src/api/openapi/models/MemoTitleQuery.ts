/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type MemoTitleQuery = {
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
    starred?: boolean;
    /**
     * The query term to search within the title of the Memo
     */
    title_query: string;
    /**
     * If true, filename prefix search is done. If false exact title is searched.
     */
    prefix: boolean;
};

