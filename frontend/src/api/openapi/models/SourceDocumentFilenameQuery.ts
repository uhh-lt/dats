/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SourceDocumentFilenameQuery = {
    /**
     * The ID of the Project the SourceDocuments have to belong to.
     */
    proj_id: number;
    /**
     * The query term to search within the filename of the SourceDocuments
     */
    filename_query: string;
    /**
     * If true, filename prefix search is done. If false exact filename is searched.
     */
    prefix: boolean;
};

