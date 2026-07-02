import { CodeRead } from "@models/CodeRead";
import { CardProps } from "@mui/material";
import { AnnotationRead } from "./AnnotationRead";

export interface AnnotationCardProps<T extends AnnotationRead> {
  annotation: T;
  code: CodeRead;
  onClick: () => void;
  cardProps?: CardProps;
  isSelected: boolean;
}
