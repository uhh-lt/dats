import { BorderNodeData } from "@models/BorderNodeData";
import { WhiteboardNodeType } from "@models/WhiteboardNodeType";
import { Node, NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { TextNodeComponent } from "./TextNodeComponent";

export type BorderNode = Node<BorderNodeData, WhiteboardNodeType.BORDER>;
export function BorderNode(props: NodeProps<BorderNode>) {
  return (
    <BaseNode
      allowDrawConnection={false}
      nodeProps={props}
      alignment={props.data.verticalAlign}
      style={{
        borderRadius: props.data.borderRadius,
        borderColor: props.data.borderColor,
        borderWidth: props.data.borderWidth,
        borderStyle: props.data.borderStyle,
        backgroundColor: props.data.bgcolor + props.data.bgalpha?.toString(16).padStart(2, "0"),
      }}
    >
      <TextNodeComponent nodeProps={props} />
    </BaseNode>
  );
}
