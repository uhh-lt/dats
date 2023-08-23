/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type DocumentTagCreate = {
    /**
     * Title of the DocumentTag
     */
    title: string;
    /**
     * Description of the DocumentTag
     */
    description?: string;
    /**
     * Color of the Code
     */
    color?: string;
    /**
     * Project the DocumentTag belongs to
     */
    project_id: number;
};

