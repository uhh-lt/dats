import { NodeProps } from "reactflow";
import { NoteNodeData } from "../../../api/openapi/models/NoteNodeData.ts";
import { BaseNode } from "./BaseNode.tsx";
import { TextNodeComponent } from "./TextNodeComponent.tsx";

export function NoteNode(props: NodeProps<NoteNodeData>) {
  return (
    <BaseNode
      allowDrawConnection={false}
      nodeProps={props}
      alignment={props.data.verticalAlign}
      style={{
        backgroundColor: props.data.bgcolor + props.data.bgalpha?.toString(16).padStart(2, "0"),
      }}
    >
      <TextNodeComponent nodeProps={props} />
    </BaseNode>
  );
}
