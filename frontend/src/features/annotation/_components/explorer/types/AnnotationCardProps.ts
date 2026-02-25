import { CardProps } from "@mui/material";
import { CodeRead } from "../../../../../api/openapi/models/CodeRead";
import { AnnotationRead } from "./AnnotationRead";

export interface AnnotationCardProps<T extends AnnotationRead> {
  annotation: T;
  code: CodeRead;
  onClick: () => void;
  cardProps?: CardProps;
  isSelected: boolean;
}
