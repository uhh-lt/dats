import { HorizontalAlign } from "../../../../api/openapi/models/HorizontalAlign.ts";
import { VerticalAlign } from "../../../../api/openapi/models/VerticalAlign.ts";

export interface TextData {
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  horizontalAlign: HorizontalAlign;
  verticalAlign: VerticalAlign;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
}
