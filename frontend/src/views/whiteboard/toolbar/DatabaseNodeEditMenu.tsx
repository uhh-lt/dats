import { Paper, Stack } from "@mui/material";
import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Node, useReactFlow } from "reactflow";
import { DatabaseNodeData } from "../types/DatabaseNodeData";
import ColorTool from "./tools/ColorTool";
import SliderTool from "./tools/SliderTool";

interface DatabaseNodeEditMenuProps {}

export interface DatabaseNodeEditMenuHandle {
  open: (nodeId: string) => void;
  close: () => void;
}

const DatabaseNodeEditMenu = forwardRef<DatabaseNodeEditMenuHandle, DatabaseNodeEditMenuProps>((_, ref) => {
  const reactFlowInstance = useReactFlow<DatabaseNodeData>();

  const [nodeId, setNodeId] = useState<string | null>(null);
  const [node, setNode] = useState<Node<DatabaseNodeData> | undefined>();

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
  }));

  // methods
  const openMenu = (nodeId: string) => {
    setNodeId(nodeId);
    setNode(reactFlowInstance.getNode(nodeId));
  };

  const closeMenu = () => {
    setNodeId(null);
    setNode(undefined);
  };

  const updateNode = useCallback(
    (nodeId: string | null, updateFnc: (oldNode: Node<DatabaseNodeData>) => Node<DatabaseNodeData>) => {
      reactFlowInstance.setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            const newNode = updateFnc(node);
            setNode(newNode);
            return newNode;
          }

          return node;
        })
      );
    },
    [reactFlowInstance]
  );

  const handleBGColorChange = (color: string) => {
    updateNode(nodeId, (oldNode) => {
      return {
        ...oldNode,
        data: {
          ...oldNode.data,
          bgcolor: color,
        },
      };
    });
  };

  const handleBGAlphaChange = (alpha: number) => {
    updateNode(nodeId, (oldNode) => {
      return {
        ...oldNode,
        data: {
          ...oldNode.data,
          bgalpha: alpha,
        },
      };
    });
  };

  return (
    <>
      {node !== undefined && (
        <Paper sx={{ p: 1 }}>
          <Stack direction="row" alignItems="center">
            <ColorTool
              key={`bg-color-${node.id}`}
              caption="BG:"
              color={node.data.bgcolor}
              onColorChange={handleBGColorChange}
            />
            <SliderTool key={`bg-alpha-${node.id}`} value={node.data.bgalpha} onValueChange={handleBGAlphaChange} />
          </Stack>
        </Paper>
      )}
    </>
  );
});

export default DatabaseNodeEditMenu;
