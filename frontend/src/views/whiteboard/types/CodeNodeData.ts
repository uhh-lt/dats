import { DatabaseNodeData } from "./DatabaseNodeData";

export interface CodeNodeData extends DatabaseNodeData {
  codeId: number;
  parentCodeId: number | undefined;
}
