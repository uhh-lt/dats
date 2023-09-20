import { Button, ButtonGroup, Divider, OutlinedInput, Paper, Stack, TypographyVariant } from "@mui/material";
import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { useReactFlow } from "reactflow";
import { TextNodeData } from "../types";

interface TextNodeEditMenuProps {}

export interface TextNodeEditMenuHandle {
  open: (nodeId: string) => void;
  close: () => void;
}

const TextNodeEditMenu = forwardRef<TextNodeEditMenuHandle, TextNodeEditMenuProps>(({}, ref) => {
  const reactFlowInstance = useReactFlow<TextNodeData>();

  const [nodeId, setNodeId] = useState<string | null>(null);
  const node = nodeId ? reactFlowInstance.getNode(nodeId) : undefined;

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
  }));

  // methods
  const openMenu = (nodeId: string) => {
    setNodeId(nodeId);
  };

  const closeMenu = () => {
    setNodeId(null);
  };

  const handleVariantClick =
    (variant: TypographyVariant) => (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      reactFlowInstance.setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                variant: variant,
              },
            };
          }

          return node;
        })
      );
    };

  let timeout: NodeJS.Timeout | undefined;
  const handleColorChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    timeout && clearTimeout(timeout);
    timeout = setTimeout(() => {
      const color = event.target.value;
      reactFlowInstance.setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                color: color,
              },
            };
          }

          return node;
        })
      );
    }, 333);
  };

  return (
    <>
      {node !== undefined && (
        <Paper sx={{ p: 1 }}>
          <Stack direction="row" alignItems="center">
            <ButtonGroup size="small" className="nodrag" sx={{ mr: 1, bgcolor: "background.paper" }}>
              <Button
                variant={node.data.variant === "h1" ? "contained" : "outlined"}
                onClick={handleVariantClick("h1")}
              >
                H1
              </Button>
              <Button
                variant={node.data.variant === "h2" ? "contained" : "outlined"}
                onClick={handleVariantClick("h2")}
              >
                H2
              </Button>
              <Button
                variant={node.data.variant === "h3" ? "contained" : "outlined"}
                onClick={handleVariantClick("h3")}
              >
                H3
              </Button>
              <Button
                variant={node.data.variant === "body1" ? "contained" : "outlined"}
                onClick={handleVariantClick("body1")}
              >
                B
              </Button>
            </ButtonGroup>
            <Divider orientation="vertical" flexItem />
            Color:
            <OutlinedInput
              key={nodeId}
              sx={{ bgcolor: "background.paper", p: 0 }}
              className="nodrag"
              type="color"
              onChange={handleColorChange}
              defaultValue={node.data.color}
              inputProps={{
                style: {
                  padding: "1.5px 3px",
                  height: "28px",
                  width: "28px",
                },
              }}
            />
          </Stack>
        </Paper>
      )}
    </>
  );
});

export default TextNodeEditMenu;
