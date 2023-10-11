import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import VerticalAlignCenterIcon from "@mui/icons-material/VerticalAlignCenter";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import RemoveIcon from "@mui/icons-material/Remove";

import {
  Box,
  Button,
  ButtonGroup,
  Divider,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  SelectChangeEvent,
  Slider,
  Stack,
  TypographyVariant,
} from "@mui/material";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { Node, useReactFlow } from "reactflow";
import { BorderNodeData, NoteNodeData, TextNodeData, isBorderNode, isNoteNode } from "../types";

interface TextNodeEditMenuProps {}

export interface TextNodeEditMenuHandle {
  open: (nodeId: string) => void;
  close: () => void;
}

const TextNodeEditMenu = forwardRef<TextNodeEditMenuHandle, TextNodeEditMenuProps>(({}, ref) => {
  const reactFlowInstance = useReactFlow<TextNodeData | NoteNodeData | BorderNodeData>();

  const [nodeId, setNodeId] = useState<string | null>(null);
  const [node, setNode] = useState<Node<TextNodeData | NoteNodeData | BorderNodeData> | undefined>();

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

  const handleVariantChange = (event: SelectChangeEvent<TypographyVariant>) => {
    reactFlowInstance.setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          const newNode = {
            ...node,
            data: {
              ...node.data,
              variant: event.target.value as TypographyVariant,
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

  const handleBorderStyleClick =
    (borderStyle: "dashed" | "solid" | "dotted") => (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      reactFlowInstance.setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            const newNode = {
              ...node,
              data: {
                ...node.data,
                borderStyle: borderStyle,
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
            const newNode = {
              ...node,
              data: {
                ...node.data,
                color: color,
              },
            };
            setNode(newNode);
            return newNode;
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
            const newNode = {
              ...node,
              data: {
                ...node.data,
                bgcolor: color,
              },
            };
            setNode(newNode);
            return newNode;
          }

          return node;
        })
      );
    }, 333);
  };

  let timeout3: NodeJS.Timeout | undefined;
  const handleBorderColorChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    timeout3 && clearTimeout(timeout3);
    timeout3 = setTimeout(() => {
      const color = event.target.value;
      reactFlowInstance.setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            const newNode = {
              ...node,
              data: {
                ...node.data,
                borderColor: color,
              },
            };
            setNode(newNode);
            return newNode;
          }

          return node;
        })
      );
    }, 333);
  };

  let timeout4: NodeJS.Timeout | undefined;
  const handleBorderWidthChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    timeout4 && clearTimeout(timeout4);
    timeout4 = setTimeout(() => {
      const width = parseInt(event.target.value);
      reactFlowInstance.setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            const newNode = {
              ...node,
              data: {
                ...node.data,
                borderWidth: Math.max(1, Math.min(width, 20)),
              },
            };
            setNode(newNode);
            return newNode;
          }

          return node;
        })
      );
    }, 333);
  };

  const handleBGAlphaChange = (event: React.SyntheticEvent | Event, value: number | number[]) => {
    reactFlowInstance.setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          const newNode = {
            ...node,
            data: {
              ...node.data,
              bgalpha: value,
            },
          };
          setNode(newNode);
          return newNode;
        }

        return node;
      })
    );
  };

  return (
    <>
      {node !== undefined && (
        <Paper sx={{ p: 1 }}>
          <Stack direction="row" alignItems="center">
            <Select
              style={{ height: "32px" }}
              size="small"
              key={`font-${nodeId}`}
              defaultValue={node.data.variant}
              onChange={handleVariantChange}
            >
              {["h1", "h2", "h3", "h4", "body1", "body2"].map((variant) => (
                <MenuItem key={variant} value={variant}>
                  {variant.toUpperCase()}
                </MenuItem>
              ))}
            </Select>
            <ButtonGroup size="small" className="nodrag" sx={{ mx: 1, bgcolor: "background.paper" }}>
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
            <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
            Color:
            <OutlinedInput
              key={`color-${nodeId}`}
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
            {isNoteNode(node) && (
              <>
                BG:
                <OutlinedInput
                  key={`bgcolor-${nodeId}`}
                  sx={{ bgcolor: "background.paper", p: 0, ml: 0.5, mr: 0.5 }}
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
                <Box sx={{ width: 40, display: "flex", alignItems: "center", mr: 0.5 }}>
                  <Slider
                    key={`bgalpha-${nodeId}`}
                    size="small"
                    defaultValue={node.data.bgalpha}
                    step={1}
                    min={0}
                    max={255}
                    onChangeCommitted={handleBGAlphaChange}
                  />
                </Box>
              </>
            )}
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
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
            {isBorderNode(node) && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                Border:
                <OutlinedInput
                  key={`bordercolor-${nodeId}`}
                  sx={{ bgcolor: "background.paper", p: 0, ml: 0.5, mr: 0.5 }}
                  className="nodrag"
                  type="color"
                  onChange={handleBorderColorChange}
                  defaultValue={node.data.borderColor}
                  inputProps={{
                    style: {
                      padding: "1.5px 3px",
                      height: "28px",
                      width: "28px",
                    },
                  }}
                />
                <OutlinedInput
                  key={`borderwidth-${nodeId}`}
                  sx={{ bgcolor: "background.paper", p: 0, ml: 0.5, mr: 0.5 }}
                  className="nodrag"
                  type="number"
                  onChange={handleBorderWidthChange}
                  defaultValue={node.data.borderWidth}
                  inputProps={{
                    style: {
                      padding: "1.5px 3px",
                      height: "28px",
                      width: "34px",
                    },
                    min: 1,
                    max: 20,
                  }}
                />
                <ButtonGroup size="small" className="nodrag" sx={{ mr: 1, bgcolor: "background.paper" }}>
                  <Button
                    variant={node.data.borderStyle === "solid" ? "contained" : "outlined"}
                    onClick={handleBorderStyleClick("solid")}
                  >
                    <RemoveIcon />
                  </Button>
                  <Button
                    variant={node.data.borderStyle === "dashed" ? "contained" : "outlined"}
                    onClick={handleBorderStyleClick("dashed")}
                  >
                    <b>---</b>
                  </Button>
                  <Button
                    variant={node.data.borderStyle === "dotted" ? "contained" : "outlined"}
                    onClick={handleBorderStyleClick("dotted")}
                  >
                    <MoreHorizIcon />
                  </Button>
                </ButtonGroup>
              </>
            )}
          </Stack>
        </Paper>
      )}
    </>
  );
});

export default TextNodeEditMenu;
