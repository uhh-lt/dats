import { NodeProps, useReactFlow } from "reactflow";
import { useTextNode } from "../toolbar/textNodeUtils.tsx";
import { TextData } from "../types/base/TextData.ts";
import BaseNode from "./BaseNode.tsx";

function TextNode(props: NodeProps<TextData>) {
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
      >
        {children}
      </BaseNode>
    ),
  });

  return renderContent();
}

export default TextNode;
