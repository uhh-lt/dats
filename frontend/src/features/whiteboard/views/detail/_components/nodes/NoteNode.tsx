import { NoteNodeData } from "@models/NoteNodeData";
import { WhiteboardNodeType } from "@models/WhiteboardNodeType";
import { Node, NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { TextNodeComponent } from "./TextNodeComponent";

export type NoteNode = Node<NoteNodeData, WhiteboardNodeType.NOTE>;
export function NoteNode(props: NodeProps<NoteNode>) {
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
