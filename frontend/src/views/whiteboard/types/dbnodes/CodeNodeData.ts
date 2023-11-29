import { BackgroundColorData } from "../base/BackgroundColorData";

export interface CodeNodeData extends BackgroundColorData {
  codeId: number;
  parentCodeId: number | null | undefined;
}
