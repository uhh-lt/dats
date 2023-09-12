/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { BBoxAnnotationRead } from "./BBoxAnnotationRead";
import type { CodeRead } from "./CodeRead";
import type { SourceDocumentRead } from "./SourceDocumentRead";
import type { SpanAnnotationRead } from "./SpanAnnotationRead";

export type AnnotationOccurrence = {
  /**
   * The Annotation
   */
  annotation: SpanAnnotationRead | BBoxAnnotationRead;
  /**
   * The occuring Code.
   */
  code: CodeRead;
  /**
   * The SourceDocument where the Code occurs.
   */
  sdoc: SourceDocumentRead;
  /**
   * The Tet of the Annotation
   */
  text: string;
};
