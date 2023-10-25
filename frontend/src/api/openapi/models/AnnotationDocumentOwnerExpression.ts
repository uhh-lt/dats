/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { IdEquals } from "./IdEquals";
import type { IdIsOneOf } from "./IdIsOneOf";

export type AnnotationDocumentOwnerExpression = {
  operator: IdEquals | IdIsOneOf;
};
