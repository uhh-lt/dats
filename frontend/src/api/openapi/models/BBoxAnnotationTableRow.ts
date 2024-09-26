/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeRead } from "./CodeRead";
import type { DocumentTagRead } from "./DocumentTagRead";
import type { MemoRead } from "./MemoRead";
import type { SourceDocumentRead } from "./SourceDocumentRead";
export type BBoxAnnotationTableRow = {
  /**
   * ID of the BBoxAnnotation
   */
  id: number;
  /**
   * The x-coordinate of the BBoxAnnotation.
   */
  x: number;
  /**
   * The y-coordinate of the BBoxAnnotation.
   */
  y: number;
  /**
   * The width of the BBoxAnnotation.
   */
  width: number;
  /**
   * The height of the BBoxAnnotation.
   */
  height: number;
  /**
   * The url to the Image of the BBoxAnnotation.
   */
  url: string;
  /**
   * Code the BBoxAnnotation refers to
   */
  code: CodeRead;
  /**
   * User the BBoxAnnotation belongs to
   */
  user_id: number;
  /**
   * SourceDocument the BBoxAnnotation refers to
   */
  sdoc: SourceDocumentRead;
  /**
   * The DocumentTags of the SourceDocument.
   */
  tags: Array<DocumentTagRead>;
  /**
   * The Memo of the Annotation.
   */
  memo: MemoRead | null;
};
