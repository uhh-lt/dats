import { NoteNodeData } from "./customnodes/NoteNodeData.ts";

export interface CustomEdgeData {
  label: NoteNodeData & { fontSize?: number };
  type: "bezier" | "straight" | "simplebezier" | "smoothstep";
}
