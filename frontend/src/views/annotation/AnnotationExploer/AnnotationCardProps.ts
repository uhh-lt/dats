import { CardProps } from "@mui/material";
import { BBoxAnnotationReadResolved } from "../../../api/openapi/models/BBoxAnnotationReadResolved.ts";
import { SpanAnnotationReadResolved } from "../../../api/openapi/models/SpanAnnotationReadResolved.ts";

type AnnotationReadResolved = SpanAnnotationReadResolved | BBoxAnnotationReadResolved;

export interface AnnotationCardProps<T extends AnnotationReadResolved> {
  annotation: T;
  onClick: () => void;
  cardProps?: CardProps;
}
