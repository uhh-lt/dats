/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SourceDocumentSentences = {
    /**
     * ID of the SourceDocument the Sentences belong to.
     */
    source_document_id: number;
    /**
     * The Sentences of the SourceDocument the Sentences belong to.
     */
    sentences: Array<string>;
    /**
     * The list of character offsets of the Sentences
     */
    sentence_character_offsets?: Array<Array<any>>;
};

