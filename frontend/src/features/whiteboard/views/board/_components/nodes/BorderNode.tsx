import { BorderNodeData } from "@api/models/BorderNodeData";
import { NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { TextNodeComponent } from "./TextNodeComponent";

export function BorderNode(props: NodeProps<BorderNodeData>) {
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
