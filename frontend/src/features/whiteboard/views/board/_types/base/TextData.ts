import { HorizontalAlign } from "@models/HorizontalAlign";
import { VerticalAlign } from "@models/VerticalAlign";

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
