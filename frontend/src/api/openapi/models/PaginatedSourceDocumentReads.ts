/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { SourceDocumentRead } from './SourceDocumentRead';

export type PaginatedSourceDocumentReads = {
    /**
     * Flag that indicates whether there are more search results.
     */
    has_more: boolean;
    /**
     * The total number of results.
     */
    total: number;
    /**
     * The offset that returns the current results.
     */
    current_page_offset: number;
    /**
     * The offset that returns the next results.
     */
    next_page_offset: number;
    /**
     * The SourceDocuments on this page
     */
    sdocs: Array<SourceDocumentRead>;
};

