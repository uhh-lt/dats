/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SpanAnnotationRead = {
    /**
     * Begin of the SpanAnnotation in characters
     */
    begin: number;
    /**
     * End of the SpanAnnotation in characters
     */
    end: number;
    /**
     * Begin of the SpanAnnotation in tokens
     */
    begin_token: number;
    /**
     * End of the SpanAnnotation in tokens
     */
    end_token: number;
    /**
     * ID of the SpanAnnotation
     */
    id: number;
    /**
     * The SpanText the SpanAnnotation spans.
     */
    span_text_id: string;
    /**
     * CurrentCode the SpanAnnotation refers to
     */
    current_code_id: number;
    /**
     * AnnotationDocument the SpanAnnotation refers to
     */
    annotation_document_id: number;
    /**
     * Created timestamp of the SpanAnnotation
     */
    created: string;
    /**
     * Updated timestamp of the SpanAnnotation
     */
    updated: string;
};

