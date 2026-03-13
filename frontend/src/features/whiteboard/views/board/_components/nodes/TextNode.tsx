import { NodeProps } from "@xyflow/react";
import { TextData } from "../../_types/base/TextData";
import { BaseNode } from "./BaseNode";
import { TextNodeComponent } from "./TextNodeComponent";

export function TextNode(props: NodeProps<TextData>) {
  return (
    <BaseNode allowDrawConnection={false} nodeProps={props} alignment={props.data.verticalAlign}>
      <TextNodeComponent nodeProps={props} />
    </BaseNode>
  );
}
