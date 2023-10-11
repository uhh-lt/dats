import { NoteNodeData } from "./NoteNodeData";

export interface BorderNodeData extends NoteNodeData {
  borderColor: string;
  borderRadius: string;
  borderWidth: number;
  borderStyle: "solid" | "dashed" | "dotted";
}
