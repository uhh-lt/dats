/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type BBoxAnnotationRead = {
    /**
     * Absolute x_min coordinate of the BBoxAnnotation
     */
    x_min: number;
    /**
     * Absolute x_max coordinate of the BBoxAnnotation
     */
    x_max: number;
    /**
     * Absolute y_min coordinate of the BBoxAnnotation
     */
    y_min: number;
    /**
     * Absolute y_max coordinate of the BBoxAnnotation
     */
    y_max: number;
    /**
     * ID of the BBoxAnnotation
     */
    id: number;
    /**
     * CurrentCode the BBoxAnnotation refers to
     */
    current_code_id: number;
    /**
     * AnnotationDocument the BBoxAnnotation refers to
     */
    annotation_document_id: number;
    /**
     * Created timestamp of the BBoxAnnotation
     */
    created: string;
    /**
     * Updated timestamp of the BBoxAnnotation
     */
    updated: string;
};

