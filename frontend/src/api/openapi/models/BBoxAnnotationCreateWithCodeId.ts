/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type BBoxAnnotationCreateWithCodeId = {
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
     * Code the BBoxAnnotation refers to
     */
    code_id: number;
    /**
     * AnnotationDocument the BBoxAnnotation refers to
     */
    annotation_document_id: number;
};

