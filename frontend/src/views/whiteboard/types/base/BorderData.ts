import { BorderStyle } from "../../../../api/openapi/models/BorderStyle.ts";

export interface BorderData {
  borderColor: string;
  borderRadius: string;
  borderWidth: number;
  borderStyle: BorderStyle;
}
