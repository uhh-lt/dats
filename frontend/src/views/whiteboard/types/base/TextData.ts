export interface TextData {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  color: string;
  horizontalAlign: "left" | "center" | "right";
  verticalAlign: "top" | "center" | "bottom";
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough?: boolean;
}
