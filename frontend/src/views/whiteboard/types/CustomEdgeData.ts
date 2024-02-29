import { NoteNodeData } from "./customnodes/NoteNodeData.ts";

export interface CustomEdgeData {
  label: NoteNodeData;
  type: "bezier" | "straight" | "simplebezier" | "smoothstep";
}
