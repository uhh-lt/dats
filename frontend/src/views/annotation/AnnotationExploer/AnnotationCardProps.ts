import { CardProps } from "@mui/material";
import { BBoxAnnotationReadResolvedCode } from "../../../api/openapi/models/BBoxAnnotationReadResolvedCode.ts";
import { SpanAnnotationReadResolved } from "../../../api/openapi/models/SpanAnnotationReadResolved.ts";

type AnnotationReadResolved = SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode;

export interface AnnotationCardProps<T extends AnnotationReadResolved> {
  annotation: T;
  onClick: () => void;
  cardProps?: CardProps;
}
