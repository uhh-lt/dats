import { NodeProps, useReactFlow } from "reactflow";
import { BorderNodeData } from "../../../api/openapi/models/BorderNodeData.ts";
import { useTextNode } from "../toolbar/textNodeUtils.tsx";
import BaseNode from "./BaseNode.tsx";

function BorderNode(props: NodeProps<BorderNodeData>) {
  const reactFlowInstance = useReactFlow();

  const handleTextChange = (value: string) => {
    reactFlowInstance.setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return {
            ...node,
            data: {
              ...node.data,
              text: value,
            },
          };
        }
        return node;
      }),
    );
  };

  const { handleClick, renderContent } = useTextNode({
    nodeProps: props,
    onTextChange: handleTextChange,
    renderContainer: (children) => (
      <BaseNode
        allowDrawConnection={false}
        nodeProps={props}
        onClick={handleClick}
        alignment={props.data.verticalAlign}
        style={{
          borderRadius: props.data.borderRadius,
          borderColor: props.data.borderColor,
          borderWidth: props.data.borderWidth,
          borderStyle: props.data.borderStyle,
          backgroundColor: props.data.bgcolor + props.data.bgalpha?.toString(16).padStart(2, "0"),
        }}
      >
        {children}
      </BaseNode>
    ),
  });

  return renderContent();
}

export default BorderNode;
