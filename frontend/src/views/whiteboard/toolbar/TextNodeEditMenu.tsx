import { Button, ButtonGroup, Divider, OutlinedInput, Paper, Stack, TypographyVariant } from "@mui/material";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useReactFlow } from "reactflow";
import { TextNodeData } from "../types";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import VerticalAlignCenterIcon from "@mui/icons-material/VerticalAlignCenter";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";

interface TextNodeEditMenuProps {}

export interface TextNodeEditMenuHandle {
  open: (nodeId: string) => void;
  close: () => void;
}

const TextNodeEditMenu = forwardRef<TextNodeEditMenuHandle, TextNodeEditMenuProps>(({}, ref) => {
  const reactFlowInstance = useReactFlow<TextNodeData>();

  const [nodeId, setNodeId] = useState<string | null>(null);
  const [node, setNode] = useState(nodeId ? reactFlowInstance.getNode(nodeId) : undefined);

  // update node when nodeId changes
  useEffect(() => {
    setNode(nodeId ? reactFlowInstance.getNode(nodeId) : undefined);
  }, [nodeId, reactFlowInstance]);

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
            const newNode = {
              ...node,
              data: {
                ...node.data,
                variant: variant,
              },
            };
            setNode(newNode);
            return newNode;
          }

          return node;
        })
      );
    };

  const handleHorizontalAlignClick =
    (horizontal: "left" | "center" | "right") => (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      reactFlowInstance.setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            const newNode = {
              ...node,
              data: {
                ...node.data,
                horizontalAlign: horizontal,
              },
            };
            setNode(newNode);
            return newNode;
          }

          return node;
        })
      );
    };

  const handleVerticalAlignClick =
    (verticalAlign: "top" | "center" | "bottom") => (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      reactFlowInstance.setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            const newNode = {
              ...node,
              data: {
                ...node.data,
                verticalAlign: verticalAlign,
              },
            };
            setNode(newNode);
            return newNode;
          }

          return node;
        })
      );
    };

  const handleStyleClick =
    (style: "bold" | "italic" | "underline") => (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      reactFlowInstance.setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            const newNode = {
              ...node,
              data: {
                ...node.data,
                ...(style === "bold" && { bold: !node.data.bold }),
                ...(style === "italic" && { italic: !node.data.italic }),
                ...(style === "underline" && { underline: !node.data.underline }),
              },
            };
            setNode(newNode);
            return newNode;
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

  let timeout2: NodeJS.Timeout | undefined;
  const handleBGColorChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    timeout2 && clearTimeout(timeout2);
    timeout2 = setTimeout(() => {
      const color = event.target.value;
      reactFlowInstance.setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                bgcolor: color,
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
              {["h1", "h2", "h3", "h4", "body1", "body2"].map((variant) => (
                <Button
                  key={variant}
                  variant={node.data.variant === variant ? "contained" : "outlined"}
                  onClick={handleVariantClick(variant as TypographyVariant)}
                >
                  {variant.toUpperCase()}
                </Button>
              ))}
            </ButtonGroup>
            <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
            Color:
            <OutlinedInput
              key={nodeId}
              sx={{ bgcolor: "background.paper", p: 0, ml: 0.5, mr: 1 }}
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
            BG:
            <OutlinedInput
              key={nodeId}
              sx={{ bgcolor: "background.paper", p: 0, ml: 0.5 }}
              className="nodrag"
              type="color"
              onChange={handleBGColorChange}
              defaultValue={node.data.bgcolor}
              inputProps={{
                style: {
                  padding: "1.5px 3px",
                  height: "28px",
                  width: "28px",
                },
              }}
            />
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <ButtonGroup size="small" className="nodrag" sx={{ mr: 1, bgcolor: "background.paper" }}>
              <Button variant={node.data.bold ? "contained" : "outlined"} onClick={handleStyleClick("bold")}>
                <FormatBoldIcon />
              </Button>
              <Button variant={node.data.italic ? "contained" : "outlined"} onClick={handleStyleClick("italic")}>
                <FormatItalicIcon />
              </Button>
              <Button variant={node.data.underline ? "contained" : "outlined"} onClick={handleStyleClick("underline")}>
                <FormatUnderlinedIcon />
              </Button>
            </ButtonGroup>
            <ButtonGroup size="small" className="nodrag" sx={{ mr: 1, bgcolor: "background.paper" }}>
              <Button
                variant={node.data.horizontalAlign === "left" ? "contained" : "outlined"}
                onClick={handleHorizontalAlignClick("left")}
              >
                <FormatAlignLeftIcon />
              </Button>
              <Button
                variant={node.data.horizontalAlign === "center" ? "contained" : "outlined"}
                onClick={handleHorizontalAlignClick("center")}
              >
                <FormatAlignCenterIcon />
              </Button>
              <Button
                variant={node.data.horizontalAlign === "right" ? "contained" : "outlined"}
                onClick={handleHorizontalAlignClick("right")}
              >
                <FormatAlignRightIcon />
              </Button>
            </ButtonGroup>
            <ButtonGroup size="small" className="nodrag" sx={{ mr: 1, bgcolor: "background.paper" }}>
              <Button
                variant={node.data.verticalAlign === "top" ? "contained" : "outlined"}
                onClick={handleVerticalAlignClick("top")}
              >
                <VerticalAlignTopIcon />
              </Button>
              <Button
                variant={node.data.verticalAlign === "center" ? "contained" : "outlined"}
                onClick={handleVerticalAlignClick("center")}
              >
                <VerticalAlignCenterIcon />
              </Button>
              <Button
                variant={node.data.verticalAlign === "bottom" ? "contained" : "outlined"}
                onClick={handleVerticalAlignClick("bottom")}
              >
                <VerticalAlignBottomIcon />
              </Button>
            </ButtonGroup>
          </Stack>
        </Paper>
      )}
    </>
  );
});

export default TextNodeEditMenu;
