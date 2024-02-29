import { BackgroundColorData } from "../base/BackgroundColorData.ts";

export interface CodeNodeData extends BackgroundColorData {
  codeId: number;
  parentCodeId: number | null | undefined;
}
