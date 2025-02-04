import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import VerticalAlignCenterIcon from "@mui/icons-material/VerticalAlignCenter";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";

import { Button, ButtonGroup, Divider, Paper, Stack, Typography, TypographyVariant } from "@mui/material";
import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Node, useReactFlow } from "reactflow";
import { BackgroundColorData } from "../types/base/BackgroundColorData.ts";
import { BorderData } from "../types/base/BorderData.ts";
import { TextData } from "../types/base/TextData.ts";
import { hasTextData, isBackgroundColorDataArray, isBorderDataArray, isTextDataArray } from "../types/typeGuards.ts";
import ColorTool from "./tools/ColorTool.tsx";
import NumberTool from "./tools/NumberTool.tsx";
import SliderTool from "./tools/SliderTool.tsx";
import SolidDashedDottedTool from "./tools/SolidDashedDottedTool.tsx";
import TypographyVariantTool from "./tools/TypographyVariantTool.tsx";

export interface NodeEditMenuHandle {
  open: (nodes: Node[]) => void;
  close: () => void;
}

const NodeEditMenu = forwardRef<NodeEditMenuHandle>((_, ref) => {
  const reactFlowInstance = useReactFlow<BackgroundColorData | TextData | BorderData>();
  const [nodes, setNodes] = useState<Node<BackgroundColorData | TextData | BorderData>[]>([]);

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
  }));

  // methods
  const openMenu = (nodes: Node[]) => {
    // TODO: This is a workaround. It seems there is a bug in react-flow
    setNodes(nodes.map((node) => reactFlowInstance.getNode(node.id)!));
  };

  const closeMenu = () => {
    setNodes([]);
  };

  const updateNodes = useCallback(
    (
      updateFnc: (
        oldNode: Node<BackgroundColorData | TextData | BorderData>,
      ) => Node<BackgroundColorData | TextData | BorderData>,
    ) => {
      const idsToCheck = new Set(nodes.map((node) => node.id));
      const updatedNodes: Node<BackgroundColorData | TextData | BorderData>[] = [];
      reactFlowInstance.setNodes((nodes) =>
        nodes.map((node) => {
          if (idsToCheck.has(node.id)) {
            const newNode = updateFnc(node);
            updatedNodes.push(newNode);
            idsToCheck.delete(node.id);
            return newNode;
          }

          return node;
        }),
      );
    },
    [nodes, reactFlowInstance],
  );

  const handleFontSizeChange = (variant: TypographyVariant) => {
    updateNodes((oldNode) => {
      return {
        ...oldNode,
        data: {
          ...oldNode.data,
          variant: variant,
        },
      };
    });
  };

  const handleHorizontalAlignClick = (horizontal: "left" | "center" | "right") => () => {
    updateNodes((oldNode) => {
      return {
        ...oldNode,
        data: {
          ...oldNode.data,
          horizontalAlign: horizontal,
        },
      };
    });
  };

  const handleVerticalAlignClick = (verticalAlign: "top" | "center" | "bottom") => () => {
    updateNodes((oldNode) => {
      return {
        ...oldNode,
        data: {
          ...oldNode.data,
          verticalAlign: verticalAlign,
        },
      };
    });
  };

  const handleBorderStyleChange = (borderStyle: "dashed" | "solid" | "dotted") => {
    updateNodes((oldNode) => {
      return {
        ...oldNode,
        data: {
          ...oldNode.data,
          borderStyle: borderStyle,
        },
      };
    });
  };

  const handleStyleClick = (style: "bold" | "italic" | "underline") => () => {
    updateNodes((oldNode) => {
      if (hasTextData(oldNode)) {
        return {
          ...oldNode,
          data: {
            ...oldNode.data,
            ...(style === "bold" && { bold: !oldNode.data.bold }),
            ...(style === "italic" && { italic: !oldNode.data.italic }),
            ...(style === "underline" && { underline: !oldNode.data.underline }),
          },
        };
      } else {
        return oldNode;
      }
    });
  };

  const handleColorChange = (color: string) => {
    updateNodes((oldNode) => {
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
    updateNodes((oldNode) => {
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
    updateNodes((oldNode) => {
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
    updateNodes((oldNode) => {
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
    updateNodes((oldNode) => {
      return {
        ...oldNode,
        data: {
          ...oldNode.data,
          bgalpha: alpha,
        },
      };
    });
  };

  const showTextTools = isTextDataArray(nodes);
  const showBackgroundColorTools = isBackgroundColorDataArray(nodes);
  const showBorderTools = isBorderDataArray(nodes);

  return (
    <>
      {nodes.length > 0 && (
        <Paper sx={{ p: 1, mb: 1, width: "fit-content" }}>
          <Stack direction="row" alignItems="center">
            {showTextTools && (
              <>
                <TypographyVariantTool
                  key={`variant-${nodes[0].id}`}
                  variant={nodes[0].data.variant}
                  onVariantChange={handleFontSizeChange}
                />
                <ColorTool
                  caption={undefined}
                  key={`font-color-${nodes[0].id}`}
                  color={nodes[0].data.color}
                  onColorChange={handleColorChange}
                />
                <ButtonGroup size="small" className="nodrag" sx={{ mr: 1, bgcolor: "background.paper" }}>
                  <Button variant={nodes[0].data.bold ? "contained" : "outlined"} onClick={handleStyleClick("bold")}>
                    <FormatBoldIcon />
                  </Button>
                  <Button
                    variant={nodes[0].data.italic ? "contained" : "outlined"}
                    onClick={handleStyleClick("italic")}
                  >
                    <FormatItalicIcon />
                  </Button>
                  <Button
                    variant={nodes[0].data.underline ? "contained" : "outlined"}
                    onClick={handleStyleClick("underline")}
                  >
                    <FormatUnderlinedIcon />
                  </Button>
                </ButtonGroup>
                <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
                <ButtonGroup size="small" className="nodrag" sx={{ mr: 1, bgcolor: "background.paper" }}>
                  <Button
                    variant={nodes[0].data.horizontalAlign === "left" ? "contained" : "outlined"}
                    onClick={handleHorizontalAlignClick("left")}
                  >
                    <FormatAlignLeftIcon />
                  </Button>
                  <Button
                    variant={nodes[0].data.horizontalAlign === "center" ? "contained" : "outlined"}
                    onClick={handleHorizontalAlignClick("center")}
                  >
                    <FormatAlignCenterIcon />
                  </Button>
                  <Button
                    variant={nodes[0].data.horizontalAlign === "right" ? "contained" : "outlined"}
                    onClick={handleHorizontalAlignClick("right")}
                  >
                    <FormatAlignRightIcon />
                  </Button>
                </ButtonGroup>
                <ButtonGroup size="small" className="nodrag" sx={{ mr: 1, bgcolor: "background.paper" }}>
                  <Button
                    variant={nodes[0].data.verticalAlign === "top" ? "contained" : "outlined"}
                    onClick={handleVerticalAlignClick("top")}
                  >
                    <VerticalAlignTopIcon />
                  </Button>
                  <Button
                    variant={nodes[0].data.verticalAlign === "center" ? "contained" : "outlined"}
                    onClick={handleVerticalAlignClick("center")}
                  >
                    <VerticalAlignCenterIcon />
                  </Button>
                  <Button
                    variant={nodes[0].data.verticalAlign === "bottom" ? "contained" : "outlined"}
                    onClick={handleVerticalAlignClick("bottom")}
                  >
                    <VerticalAlignBottomIcon />
                  </Button>
                </ButtonGroup>
              </>
            )}
            {showBackgroundColorTools && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
                <ColorTool
                  key={`bg-color-${nodes[0].id}`}
                  caption="BG:"
                  color={nodes[0].data.bgcolor}
                  onColorChange={handleBGColorChange}
                />
                <SliderTool
                  key={`bg-alpha-${nodes[0].id}`}
                  value={nodes[0].data.bgalpha}
                  onValueChange={handleBGAlphaChange}
                />
              </>
            )}
            {showBorderTools && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
                <ColorTool
                  caption="Border:"
                  key={`bordercolor-${nodes[0].id}`}
                  color={nodes[0].data.borderColor}
                  onColorChange={handleBorderColorChange}
                />
                <NumberTool
                  key={`borderwidth-${nodes[0].id}`}
                  value={nodes[0].data.borderWidth}
                  onValueChange={handleBorderWidthChange}
                  min={1}
                  max={20}
                />
                <SolidDashedDottedTool
                  key={`borderstyle-${nodes[0].id}`}
                  value={nodes[0].data.borderStyle}
                  onValueChange={handleBorderStyleChange}
                />
              </>
            )}
            {!showTextTools && !showBackgroundColorTools && !showBorderTools && (
              <Typography variant="body1">Nodes: No common properties to edit</Typography>
            )}
          </Stack>
        </Paper>
      )}
    </>
  );
});

export default NodeEditMenu;
