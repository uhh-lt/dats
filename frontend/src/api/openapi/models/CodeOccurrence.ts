/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CodeRead } from './CodeRead';
import type { SourceDocumentRead } from './SourceDocumentRead';

export type CodeOccurrence = {
    /**
     * The SourceDocument where the Code occurs.
     */
    sdoc: SourceDocumentRead;
    /**
     * The occuring Code.
     */
    code: CodeRead;
    /**
     * A text span of the SourceDocument annotated with the Code.
     */
    text: string;
    /**
     * The number of occurrences of the text span annotated with the Code in the SourceDocument.
     */
    count: number;
};

