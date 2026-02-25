import { HorizontalAlign } from "../../../../api/openapi/models/HorizontalAlign";
import { VerticalAlign } from "../../../../api/openapi/models/VerticalAlign";

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
