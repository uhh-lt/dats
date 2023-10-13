import { NoteNodeData } from ".";

export interface CustomEdgeData {
  label: NoteNodeData;
  type: "bezier" | "straight" | "simplebezier" | "smoothstep";
}
