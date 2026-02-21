import { Divider, Paper, SelectChangeEvent, Stack, Typography } from "@mui/material";
import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Node, useReactFlow } from "reactflow";
import { BorderStyle } from "../../../api/openapi/models/BorderStyle.ts";
import { HorizontalAlign } from "../../../api/openapi/models/HorizontalAlign.ts";
import { VerticalAlign } from "../../../api/openapi/models/VerticalAlign.ts";
import { BackgroundColorData } from "../types/base/BackgroundColorData.ts";
import { BorderData } from "../types/base/BorderData.ts";
import { TextData } from "../types/base/TextData.ts";
import { TextStyle } from "../types/base/TextStyle.ts";
import { hasTextData, isBackgroundColorDataArray, isBorderDataArray, isTextDataArray } from "../types/typeGuards.ts";
import { createNodeDataByType } from "./nodeTypeUtils.ts";
import { BgColorTool } from "./tools/BgColorTool.tsx";
import { BorderColorTool } from "./tools/BorderColorTool.tsx";
import { FontColorTool } from "./tools/FontColorTool.tsx";
import { FontSelectionTool } from "./tools/FontSelectionTool.tsx";
import { NodeChangeTool } from "./tools/NodeChangeTool.tsx";
import { NumberTool } from "./tools/NumberTool.tsx";
import { TextAlignmentTool } from "./tools/TextAlignmentTool.tsx";
import { TextStyleTool } from "./tools/TextStyleTool.tsx";

export interface NodeEditMenuHandle {
  open: (nodes: Node[]) => void;
  close: () => void;
}

const NodeEditMenu = forwardRef<NodeEditMenuHandle>((_, ref) => {
  const reactFlowInstance = useReactFlow<BackgroundColorData | TextData | BorderData>();
  const [nodes, setNodes] = useState<Node<BackgroundColorData | TextData | BorderData>[]>([]);
  const [isFontFamilyMenuOpen, setIsFontFamilyMenuOpen] = useState<boolean>(false);
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

  const handleFontSizeChange = (fontSize: number) => {
    updateNodes((oldNode) => {
      return {
        ...oldNode,
        data: {
          ...oldNode.data,
          fontSize: fontSize,
        },
      };
    });
  };

  const handleHorizontalAlignClick = (horizontal: HorizontalAlign) => () => {
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

  const handleVerticalAlignClick = (verticalAlign: VerticalAlign) => () => {
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

  const handleBorderStyleChange = (borderStyle: BorderStyle) => {
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

  // Get current font family, default to Arial if not set or inconsistent
  const getCurrentFontFamily = () => {
    if (!showTextTools || !nodes[0]?.data?.fontFamily) return "Arial"; // Check for fontFamily existence
    const firstFontFamily = nodes[0].data.fontFamily;
    // Check if all selected nodes have the same font family
    const allSame = nodes.every((node) => node.data.fontFamily === firstFontFamily);
    return allSame ? firstFontFamily : ""; // Return empty string if inconsistent
  };

  const currentFontFamily = getCurrentFontFamily();

  // New handler for font family change
  const handleFontFamilyChange = (event: SelectChangeEvent) => {
    const fontFamily = event.target.value as string;
    updateNodes((oldNode) => {
      return {
        ...oldNode,
        data: {
          ...oldNode.data,
          fontFamily: fontFamily,
        },
      };
    });
  };

  const handleChangeNodeType = (nodeType: string) => {
    updateNodes((oldNode) => {
      const oldData = oldNode.data as Partial<TextData & BackgroundColorData & BorderData>;
      const { newData, nodeType: type, dimensions } = createNodeDataByType(oldData, nodeType);

      return {
        ...oldNode,
        type,
        data: newData,
        ...(dimensions || {}),
        position: {
          x: oldNode.position.x,
          y: oldNode.position.y,
        },
      };
    });
  };

  const handleStyleChange = (style: TextStyle) => {
    updateNodes((oldNode) => {
      if (hasTextData(oldNode)) {
        return {
          ...oldNode,
          data: {
            ...oldNode.data,
            ...(style === TextStyle.BOLD && { bold: !oldNode.data.bold }),
            ...(style === TextStyle.ITALIC && { italic: !oldNode.data.italic }),
            ...(style === TextStyle.UNDERLINE && { underline: !oldNode.data.underline }),
            ...(style === TextStyle.STRIKETHROUGH && { strikethrough: !oldNode.data.strikethrough }),
          },
        };
      }
      return oldNode;
    });
  };

  return (
    <>
      {nodes.length > 0 && (
        <Paper sx={{ p: 1, width: "fit-content" }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {showTextTools && (
              <>
                <NodeChangeTool onNodeTypeChange={handleChangeNodeType} node={nodes[0]} />
                <FontSelectionTool
                  currentFontFamily={currentFontFamily}
                  onFontFamilyChange={handleFontFamilyChange}
                  isMenuOpen={isFontFamilyMenuOpen}
                  onMenuOpen={() => setIsFontFamilyMenuOpen(true)}
                  onMenuClose={() => setIsFontFamilyMenuOpen(false)}
                />
                <NumberTool
                  tooltip="Font size"
                  key={`font-size-${nodes[0].id}`}
                  value={nodes[0].data.fontSize}
                  onValueChange={handleFontSizeChange}
                  min={8}
                  max={72}
                />
                <FontColorTool
                  key={`font-color-${nodes[0].id}`}
                  color={nodes[0].data.color}
                  onColorChange={handleColorChange}
                />
                <Divider orientation="vertical" flexItem />
                <TextStyleTool textData={nodes[0].data as TextData} onStyleChange={handleStyleChange} />
                <TextAlignmentTool
                  nodes={nodes}
                  handleHorizontalAlignClick={handleHorizontalAlignClick}
                  handleVerticalAlignClick={handleVerticalAlignClick}
                />
              </>
            )}
            {showBackgroundColorTools && (
              <>
                <Divider orientation="vertical" flexItem />
                <BgColorTool
                  key={`bg-color-${nodes[0].id}`}
                  color={nodes[0].data.bgcolor}
                  alpha={nodes[0].data.bgalpha}
                  onColorChange={handleBGColorChange}
                  onAlphaChange={handleBGAlphaChange}
                />
              </>
            )}
            {showBorderTools && (
              <>
                <Divider orientation="vertical" flexItem />
                <BorderColorTool
                  key={`bordercolor-${nodes[0].id}`}
                  color={nodes[0].data.borderColor}
                  onColorChange={handleBorderColorChange}
                  borderStyle={nodes[0].data.borderStyle as BorderStyle}
                  onBorderStyleChange={handleBorderStyleChange}
                />
                <NumberTool
                  tooltip="Border width"
                  key={`borderwidth-${nodes[0].id}`}
                  value={nodes[0].data.borderWidth}
                  onValueChange={handleBorderWidthChange}
                  min={1}
                  max={20}
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
