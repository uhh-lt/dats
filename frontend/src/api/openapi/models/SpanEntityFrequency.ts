/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SpanEntityFrequency = {
    /**
     * The ID of the Code related to the SpanAnnotation
     */
    code_id: number;
    /**
     * The SpanText the SpanAnnotation spans
     */
    span_text: string;
    /**
     * The ID of the SourceDocument.
     */
    sdoc_id: number;
    /**
     * Number of occurrences of the SpanEntity in the SourceDocument.
     */
    count: number;
};

