import { CardProps } from "@mui/material";
import { AnnotationReadResolved } from "./AnnotationReadResolved.ts";

export interface AnnotationCardProps<T extends AnnotationReadResolved> {
  annotation: T;
  onClick: () => void;
  cardProps?: CardProps;
  isSelected: boolean;
}
