import { NodeProps, useReactFlow } from "reactflow";
import { NoteNodeData } from "../../../api/openapi/models/NoteNodeData.ts";
import { TextNodeComponent } from "../toolbar/textNodeUtils.tsx";
import BaseNode from "./BaseNode.tsx";

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
    <BaseNode
      allowDrawConnection={false}
      nodeProps={props}
      alignment={props.data.verticalAlign}
      style={{
        backgroundColor: props.data.bgcolor + props.data.bgalpha?.toString(16).padStart(2, "0"),
      }}
    >
      <TextNodeComponent nodeProps={props} onTextChange={handleTextChange} />
    </BaseNode>
  );
}

export default NoteNode;
