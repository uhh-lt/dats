import { HorizontalAlign } from "@api/models/HorizontalAlign";
import { VerticalAlign } from "@api/models/VerticalAlign";

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
