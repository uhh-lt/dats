import { TextNodeData } from "@models/TextNodeData";
import { WhiteboardNodeType } from "@models/WhiteboardNodeType";
import { Node, NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { TextNodeComponent } from "./TextNodeComponent";

export type TextNode = Node<TextNodeData, WhiteboardNodeType.TEXT>;
export function TextNode(props: NodeProps<TextNode>) {
  return (
    <BaseNode allowDrawConnection={false} nodeProps={props} alignment={props.data.verticalAlign}>
      <TextNodeComponent nodeProps={props} />
    </BaseNode>
  );
}
