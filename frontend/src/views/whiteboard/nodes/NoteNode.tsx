import { NodeProps, useReactFlow } from "reactflow";
import { NoteNodeData } from "../../../api/openapi/models/NoteNodeData.ts";
import { TextNodeComponent } from "../toolbar/textNodeUtils.tsx";
import BaseCardNode from "./BaseCardNode.tsx";

function NoteNode(props: NodeProps<NoteNodeData>) {
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
        <BaseCardNode
          allowDrawConnection={false}
          nodeProps={props}
          backgroundColor={props.data.bgcolor + props.data.bgalpha?.toString(16).padStart(2, "0")}
          alignment={props.data.verticalAlign}
        >
          {children}
        </BaseCardNode>
      )}
    />
  );
}

export default NoteNode;
