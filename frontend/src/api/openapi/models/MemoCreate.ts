/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type MemoCreate = {
    /**
     * Title of the Memo
     */
    title: string;
    /**
     * Content of the Memo
     */
    content: string;
    /**
     * User the Memo belongs to
     */
    user_id: number;
    /**
     * Project the Memo belongs to
     */
    project_id: number;
    /**
     * Starred flag of the Memo
     */
    starred?: boolean;
};

