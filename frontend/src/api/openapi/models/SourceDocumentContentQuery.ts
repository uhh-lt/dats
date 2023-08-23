/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SourceDocumentContentQuery = {
    /**
     * The ID of the Project the SourceDocuments have to belong to.
     */
    proj_id: number;
    /**
     * The query term to search within the content of the SourceDocuments
     */
    content_query: string;
};

