/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { DocumentTagRead } from "./DocumentTagRead";
import type { MemoRead } from "./MemoRead";
import type { SourceDocumentRead } from "./SourceDocumentRead";
import type { SpanAnnotationReadResolved } from "./SpanAnnotationReadResolved";

export type AnnotatedSegment = {
  /**
   * The Annotation
   */
  annotation: SpanAnnotationReadResolved;
  /**
   * The SourceDocument where the Code occurs.
   */
  sdoc: SourceDocumentRead;
  /**
   * The Memo of the Annotation
   */
  memo?: MemoRead;
  /**
   * The Tags of the Document
   */
  tags: Array<DocumentTagRead>;
};
