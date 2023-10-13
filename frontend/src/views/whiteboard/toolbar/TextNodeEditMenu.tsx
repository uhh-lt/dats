import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import VerticalAlignCenterIcon from "@mui/icons-material/VerticalAlignCenter";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";

import { Button, ButtonGroup, Divider, Paper, Stack, TypographyVariant } from "@mui/material";
import React, { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Node, useReactFlow } from "reactflow";
import { BorderNodeData, NoteNodeData, TextNodeData, isBorderNode, isNoteNode } from "../types";
import ColorTool from "./tools/ColorTool";
import NumberTool from "./tools/NumberTool";
import SliderTool from "./tools/SliderTool";
import SolidDashedDottedTool from "./tools/SolidDashedDottedTool";
import TypographyVariantTool from "./tools/TypographyVariantTool";

interface TextNodeEditMenuProps {}

export interface TextNodeEditMenuHandle {
  open: (nodeId: string) => void;
  close: () => void;
}

const TextNodeEditMenu = forwardRef<TextNodeEditMenuHandle, TextNodeEditMenuProps>((_, ref) => {
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

  const updateNode = useCallback(
    (
      nodeId: string | null,
      updateFnc: (
        oldNode: Node<TextNodeData | NoteNodeData | BorderNodeData>
      ) => Node<TextNodeData | NoteNodeData | BorderNodeData>
    ) => {
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

  const handleFontSizeChange = (variant: TypographyVariant) => {
    updateNode(nodeId, (oldNode) => {
      return {
        ...oldNode,
        data: {
          ...oldNode.data,
          variant: variant,
        },
      };
    });
  };

  const handleHorizontalAlignClick =
    (horizontal: "left" | "center" | "right") => (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      updateNode(nodeId, (oldNode) => {
        return {
          ...oldNode,
          data: {
            ...oldNode.data,
            horizontalAlign: horizontal,
          },
        };
      });
    };

  const handleVerticalAlignClick =
    (verticalAlign: "top" | "center" | "bottom") => (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      updateNode(nodeId, (oldNode) => {
        return {
          ...oldNode,
          data: {
            ...oldNode.data,
            verticalAlign: verticalAlign,
          },
        };
      });
    };

  const handleBorderStyleChange = (borderStyle: "dashed" | "solid" | "dotted" | undefined) => {
    updateNode(nodeId, (oldNode) => {
      return {
        ...oldNode,
        data: {
          ...oldNode.data,
          borderStyle: borderStyle,
        },
      };
    });
  };

  const handleStyleClick =
    (style: "bold" | "italic" | "underline") => (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      updateNode(nodeId, (oldNode) => {
        return {
          ...oldNode,
          data: {
            ...oldNode.data,
            ...(style === "bold" && { bold: !oldNode.data.bold }),
            ...(style === "italic" && { italic: !oldNode.data.italic }),
            ...(style === "underline" && { underline: !oldNode.data.underline }),
          },
        };
      });
    };

  const handleColorChange = (color: string) => {
    updateNode(nodeId, (oldNode) => {
      return {
        ...oldNode,
        data: {
          ...oldNode.data,
          color: color,
        },
      };
    });
  };

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

  const handleBorderColorChange = (color: string) => {
    updateNode(nodeId, (oldNode) => {
      return {
        ...oldNode,
        data: {
          ...oldNode.data,
          borderColor: color,
        },
      };
    });
  };

  const handleBorderWidthChange = (width: number) => {
    updateNode(nodeId, (oldNode) => {
      return {
        ...oldNode,
        data: {
          ...oldNode.data,
          borderWidth: Math.max(1, Math.min(width, 20)),
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
            <TypographyVariantTool
              key={`variant-${nodeId}`}
              variant={node.data.variant}
              onVariantChange={handleFontSizeChange}
            />
            <ColorTool
              caption={undefined}
              key={`font-color-${nodeId}`}
              color={node.data.color}
              onColorChange={handleColorChange}
            />
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
            <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
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
            {isNoteNode(node) && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
                <ColorTool
                  key={`bg-color-${node.id}`}
                  caption="BG:"
                  color={node.data.bgcolor}
                  onColorChange={handleBGColorChange}
                />
                <SliderTool key={`bg-alpha-${node.id}`} value={node.data.bgalpha} onValueChange={handleBGAlphaChange} />
              </>
            )}
            {isBorderNode(node) && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
                <ColorTool
                  caption="Border:"
                  key={`bordercolor-${nodeId}`}
                  color={node.data.borderColor}
                  onColorChange={handleBorderColorChange}
                />
                <NumberTool
                  key={`borderwidth-${nodeId}`}
                  value={node.data.borderWidth}
                  onValueChange={handleBorderWidthChange}
                  min={1}
                  max={20}
                />
                <SolidDashedDottedTool
                  key={`borderstyle-${nodeId}`}
                  value={node.data.borderStyle}
                  onValueChange={handleBorderStyleChange}
                />
              </>
            )}
          </Stack>
        </Paper>
      )}
    </>
  );
});

export default TextNodeEditMenu;
