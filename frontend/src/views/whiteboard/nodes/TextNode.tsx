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
    <BaseNode allowDrawConnection={false} nodeProps={props} alignment={props.data.verticalAlign}>
      <TextNodeComponent nodeProps={props} onTextChange={handleTextChange} />
    </BaseNode>
  );
}

export default TextNode;
