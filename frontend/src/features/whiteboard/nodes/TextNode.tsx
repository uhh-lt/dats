import { NodeProps } from "reactflow";
import { TextData } from "../types/base/TextData.ts";
import { BaseNode } from "./BaseNode.tsx";
import { TextNodeComponent } from "./TextNodeComponent.tsx";

export function TextNode(props: NodeProps<TextData>) {
  return (
    <BaseNode allowDrawConnection={false} nodeProps={props} alignment={props.data.verticalAlign}>
      <TextNodeComponent nodeProps={props} />
    </BaseNode>
  );
}
