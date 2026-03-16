import { TextNodeData } from "@api/models/TextNodeData";
import { Node, NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { TextNodeComponent } from "./TextNodeComponent";
import { WhiteboardNodeType } from "@api/models/WhiteboardNodeType";

export type TextNode = Node<TextNodeData, WhiteboardNodeType.TEXT>;
export function TextNode(props: NodeProps<TextNode>) {
  return (
    <BaseNode allowDrawConnection={false} nodeProps={props} alignment={props.data.verticalAlign}>
      <TextNodeComponent nodeProps={props} />
    </BaseNode>
  );
}
