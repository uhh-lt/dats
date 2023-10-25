/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { AnnotationDocumentOwnerExpression } from "./AnnotationDocumentOwnerExpression";
import type { LogicalOperator } from "./LogicalOperator";

/**
 * A tree of column expressions for filtering on many database columns using various
 * comparisons.
 */
export type CodeFrequencyFilter = {
  items: Array<AnnotationDocumentOwnerExpression | CodeFrequencyFilter>;
  logic_operator: LogicalOperator;
};
