import { BorderNodeData } from "@api/models/BorderNodeData";
import { BorderStyle } from "@api/models/BorderStyle";
import { HorizontalAlign } from "@api/models/HorizontalAlign";
import { NoteNodeData } from "@api/models/NoteNodeData";
import { TextNodeData } from "@api/models/TextNodeData";
import { VerticalAlign } from "@api/models/VerticalAlign";
import { WhiteboardNodeType } from "@api/models/WhiteboardNodeType";
import { Divider, Paper, SelectChangeEvent, Stack, Typography } from "@mui/material";
import { useReactFlow } from "@xyflow/react";
import { useCallback, useImperativeHandle, useState } from "react";
import { BackgroundColorData } from "../../_types/base/BackgroundColorData";
import { BorderData } from "../../_types/base/BorderData";
import { TextData } from "../../_types/base/TextData";
import { TextStyle } from "../../_types/base/TextStyle";
import { DATSEdge } from "../../_types/DATSEdge";
import { DATSCustomNode } from "../../_types/DATSNode";
import {
  isBorderNode,
  isBorderNodeArray,
  isCustomNodeArray,
  isNodeWithBackgroundArray,
  isNoteNode,
  isTextNode,
} from "../../_types/typeGuards";
import { createNodeDataByType } from "./nodeTypeUtils";
import { BgColorTool } from "./tools/BgColorTool";
import { BorderColorTool } from "./tools/BorderColorTool";
import { FontColorTool } from "./tools/FontColorTool";
import { FontSelectionTool } from "./tools/FontSelectionTool";
import { NodeChangeTool } from "./tools/NodeChangeTool";
import { NodeType } from "./tools/NodeType";
import { NumberTool } from "./tools/NumberTool";
import { TextAlignmentTool } from "./tools/TextAlignmentTool";
import { TextStyleTool } from "./tools/TextStyleTool";

export interface NodeEditMenuHandle {
  open: (nodes: DATSCustomNode[]) => void;
  close: () => void;
}

interface NodeEditMenuProps {
  ref: React.Ref<NodeEditMenuHandle>;
}

export const NodeEditMenu = ({ ref }: NodeEditMenuProps) => {
  const reactFlowInstance = useReactFlow<DATSCustomNode, DATSEdge>();
  const [nodes, setNodes] = useState<DATSCustomNode[]>([]);
  const [isFontFamilyMenuOpen, setIsFontFamilyMenuOpen] = useState<boolean>(false);

  // methods
  const openMenu = (nodes: DATSCustomNode[]) => {
    // TODO: This is a workaround. It seems there is a bug in react-flow
    setNodes(nodes.map((node) => reactFlowInstance.getNode(node.id)!));
  };

  const closeMenu = () => {
    setNodes([]);
  };

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
  }));

  const updateNodes = useCallback(
    (updateFnc: (oldNode: DATSCustomNode) => DATSCustomNode) => {
      const idsToCheck = new Set(nodes.map((node) => node.id));
      reactFlowInstance.setNodes((nodes) =>
        nodes.map((node) => {
          if (idsToCheck.has(node.id)) {
            const newNode = updateFnc(node);
            idsToCheck.delete(node.id);
            return newNode;
          }

          return node;
        }),
      );
    },
    [nodes, reactFlowInstance],
  );

  const updateTextData = useCallback(
    (patchData: (oldData: TextData) => Partial<TextData>) => {
      updateNodes((oldNode) => {
        const patch = patchData(oldNode.data);

        if (isTextNode(oldNode)) {
          return {
            ...oldNode,
            data: {
              ...oldNode.data,
              ...patch,
            },
          };
        }

        if (isNoteNode(oldNode)) {
          return {
            ...oldNode,
            data: {
              ...oldNode.data,
              ...patch,
            },
          };
        }

        return {
          ...oldNode,
          data: {
            ...oldNode.data,
            ...patch,
          },
        };
      });
    },
    [updateNodes],
  );

  const updateBackgroundData = useCallback(
    (patchData: (oldData: BackgroundColorData) => Partial<BackgroundColorData>) => {
      updateNodes((oldNode) => {
        if (isNoteNode(oldNode)) {
          return {
            ...oldNode,
            data: {
              ...oldNode.data,
              ...patchData(oldNode.data),
            },
          };
        }

        if (isBorderNode(oldNode)) {
          return {
            ...oldNode,
            data: {
              ...oldNode.data,
              ...patchData(oldNode.data),
            },
          };
        }

        return oldNode;
      });
    },
    [updateNodes],
  );

  const updateBorderData = useCallback(
    (patchData: (oldData: BorderData) => Partial<BorderData>) => {
      updateNodes((oldNode) => {
        if (!isBorderNode(oldNode)) {
          return oldNode;
        }

        return {
          ...oldNode,
          data: {
            ...oldNode.data,
            ...patchData(oldNode.data),
          },
        };
      });
    },
    [updateNodes],
  );

  const handleFontSizeChange = (fontSize: number) => {
    updateTextData(() => ({ fontSize }));
  };

  const handleHorizontalAlignClick = (horizontal: HorizontalAlign) => () => {
    updateTextData(() => ({ horizontalAlign: horizontal }));
  };

  const handleVerticalAlignClick = (verticalAlign: VerticalAlign) => () => {
    updateTextData(() => ({ verticalAlign }));
  };

  const handleBorderStyleChange = (borderStyle: BorderStyle) => {
    updateBorderData(() => ({ borderStyle }));
  };

  const handleColorChange = (color: string) => {
    updateTextData(() => ({ color }));
  };

  const handleBGColorChange = (color: string) => {
    updateBackgroundData(() => ({ bgcolor: color }));
  };

  const handleBorderColorChange = (color: string) => {
    updateBorderData(() => ({ borderColor: color }));
  };

  const handleBorderWidthChange = (width: number) => {
    updateBorderData(() => ({ borderWidth: Math.max(1, Math.min(width, 20)) }));
  };

  const handleBGAlphaChange = (alpha: number) => {
    updateBackgroundData(() => ({ bgalpha: alpha }));
  };

  const showTextTools = isCustomNodeArray(nodes);
  const showBackgroundColorTools = isNodeWithBackgroundArray(nodes);
  const showBorderTools = isBorderNodeArray(nodes);

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
    updateTextData(() => ({ fontFamily }));
  };

  const handleChangeNodeType = (nodeType: NodeType) => {
    updateNodes((oldNode) => {
      const oldData = oldNode.data as Partial<TextData & BackgroundColorData & BorderData>;
      const { newData, nodeType: type, dimensions } = createNodeDataByType(oldData, nodeType);

      if (type === WhiteboardNodeType.TEXT) {
        return {
          ...oldNode,
          type: WhiteboardNodeType.TEXT,
          data: newData as TextNodeData,
          position: {
            x: oldNode.position.x,
            y: oldNode.position.y,
          },
        };
      }

      if (type === WhiteboardNodeType.NOTE) {
        return {
          ...oldNode,
          type: WhiteboardNodeType.NOTE,
          data: newData as NoteNodeData,
          position: {
            x: oldNode.position.x,
            y: oldNode.position.y,
          },
        };
      }

      return {
        ...oldNode,
        type: WhiteboardNodeType.BORDER,
        data: newData as BorderNodeData,
        ...(dimensions || {}),
        position: {
          x: oldNode.position.x,
          y: oldNode.position.y,
        },
      };
    });
  };

  const handleStyleChange = (style: TextStyle) => {
    updateTextData((oldData) => ({
      ...(style === TextStyle.BOLD && { bold: !oldData.bold }),
      ...(style === TextStyle.ITALIC && { italic: !oldData.italic }),
      ...(style === TextStyle.UNDERLINE && { underline: !oldData.underline }),
      ...(style === TextStyle.STRIKETHROUGH && { strikethrough: !oldData.strikethrough }),
    }));
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
};
