import { NodeProps, useReactFlow } from "reactflow";
import { TextNodeComponent } from "../toolbar/textNodeUtils.tsx";
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

  return (
    <TextNodeComponent
      nodeProps={props}
      onTextChange={handleTextChange}
      renderContainer={(children) => (
        <BaseNode allowDrawConnection={false} nodeProps={props} alignment={props.data.verticalAlign}>
          {children}
        </BaseNode>
      )}
    />
  );
}

export default TextNode;
