import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import TextFormatIcon from "@mui/icons-material/TextFormat";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import VerticalAlignCenterIcon from "@mui/icons-material/VerticalAlignCenter";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";

import {
  Button,
  ButtonGroup,
  Divider,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
  TypographyVariant,
} from "@mui/material";
import { Variant } from "@mui/material/styles/createTypography";
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
  const [textStyleAnchor, setTextStyleAnchor] = useState<null | HTMLElement>(null);
  const [alignAnchor, setAlignAnchor] = useState<null | HTMLElement>(null);
  const [verticalAlignAnchor, setVerticalAlignAnchor] = useState<null | HTMLElement>(null);

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

  const handleVerticalAlignMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setVerticalAlignAnchor(event.currentTarget);
  };

  const handleVerticalAlignClose = () => {
    setVerticalAlignAnchor(null);
  };

  const getVerticalAlignIcon = () => {
    if (!hasTextData(nodes[0])) return <VerticalAlignTopIcon />;

    const textData = nodes[0].data as TextData;
    switch (textData.verticalAlign) {
      case "top":
        return <VerticalAlignTopIcon />;
      case "center":
        return <VerticalAlignCenterIcon />;
      case "bottom":
        return <VerticalAlignBottomIcon />;
      default:
        return <VerticalAlignTopIcon />;
    }
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

  const handleTextStyleClick = (event: React.MouseEvent<HTMLElement>) => {
    setTextStyleAnchor(event.currentTarget);
  };

  const handleTextStyleClose = () => {
    setTextStyleAnchor(null);
  };

  const handleAlignClick = (event: React.MouseEvent<HTMLElement>) => {
    setAlignAnchor(event.currentTarget);
  };

  const handleAlignClose = () => {
    setAlignAnchor(null);
  };

  const getAlignIcon = () => {
    if (!hasTextData(nodes[0])) return <FormatAlignLeftIcon />;

    const textData = nodes[0].data as TextData;
    switch (textData.horizontalAlign) {
      case "left":
        return <FormatAlignLeftIcon />;
      case "center":
        return <FormatAlignCenterIcon />;
      case "right":
        return <FormatAlignRightIcon />;
      default:
        return <FormatAlignLeftIcon />;
    }
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
                  variant={nodes[0].data.variant as Variant}
                  onVariantChange={handleFontSizeChange}
                />
                <ColorTool
                  caption={undefined}
                  key={`font-color-${nodes[0].id}`}
                  color={nodes[0].data.color}
                  onColorChange={handleColorChange}
                />
                <Button variant="contained" size="small" onClick={handleTextStyleClick} sx={{ minWidth: 0, mr: 1 }}>
                  <TextFormatIcon />
                </Button>
                <Menu
                  anchorEl={textStyleAnchor}
                  open={Boolean(textStyleAnchor)}
                  onClose={handleTextStyleClose}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                  }}
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "center",
                  }}
                  sx={{
                    "& .MuiPaper-root": {
                      padding: 0,
                      margin: 0,
                    },
                    "& .MuiList-root": {
                      padding: 0,
                    },
                  }}
                >
                  <Stack direction="row" spacing={1}>
                    <MenuItem
                      onClick={() => {
                        handleStyleClick("bold")();
                        handleTextStyleClose();
                      }}
                      selected={nodes[0].data.bold}
                      sx={{ minWidth: "auto", m: 0, p: 1 }}
                    >
                      <FormatBoldIcon />
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleStyleClick("italic")();
                        handleTextStyleClose();
                      }}
                      selected={nodes[0].data.italic}
                      sx={{ minWidth: "auto", m: 0, p: 1 }}
                    >
                      <FormatItalicIcon />
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleStyleClick("underline")();
                        handleTextStyleClose();
                      }}
                      selected={nodes[0].data.underline}
                      sx={{ minWidth: "auto", m: 0, p: 1 }}
                    >
                      <FormatUnderlinedIcon />
                    </MenuItem>
                  </Stack>
                </Menu>
                <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
                <ButtonGroup size="small" className="nodrag" sx={{ mr: 1, bgcolor: "background.paper" }}>
                  <Button variant="contained" onClick={handleAlignClick} sx={{ minWidth: 0 }}>
                    {getAlignIcon()}
                  </Button>
                </ButtonGroup>
                <Menu
                  anchorEl={alignAnchor}
                  open={Boolean(alignAnchor)}
                  onClose={handleAlignClose}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                  }}
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "center",
                  }}
                  sx={{
                    "& .MuiPaper-root": {
                      padding: 0,
                      margin: 0,
                    },
                    "& .MuiList-root": {
                      padding: 0,
                    },
                  }}
                >
                  <Stack direction="row" spacing={1}>
                    <MenuItem
                      onClick={() => {
                        handleHorizontalAlignClick("left")();
                        handleAlignClose();
                      }}
                      selected={nodes[0].data.horizontalAlign === "left"}
                      sx={{ minWidth: "auto", m: 0, p: 1 }}
                    >
                      <FormatAlignLeftIcon />
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleHorizontalAlignClick("center")();
                        handleAlignClose();
                      }}
                      selected={nodes[0].data.horizontalAlign === "center"}
                      sx={{ minWidth: "auto", m: 0, p: 1 }}
                    >
                      <FormatAlignCenterIcon />
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleHorizontalAlignClick("right")();
                        handleAlignClose();
                      }}
                      selected={nodes[0].data.horizontalAlign === "right"}
                      sx={{ minWidth: "auto", m: 0, p: 1 }}
                    >
                      <FormatAlignRightIcon />
                    </MenuItem>
                  </Stack>
                </Menu>
                <ButtonGroup size="small" className="nodrag" sx={{ mr: 1, bgcolor: "background.paper" }}>
                  <Button variant="contained" onClick={handleVerticalAlignMenuClick} sx={{ minWidth: 0 }}>
                    {getVerticalAlignIcon()}
                  </Button>
                </ButtonGroup>
                <Menu
                  anchorEl={verticalAlignAnchor}
                  open={Boolean(verticalAlignAnchor)}
                  onClose={handleVerticalAlignClose}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                  }}
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "center",
                  }}
                  sx={{
                    "& .MuiPaper-root": {
                      padding: 0,
                      margin: 0,
                    },
                    "& .MuiList-root": {
                      padding: 0,
                    },
                  }}
                >
                  <Stack direction="row" spacing={1}>
                    <MenuItem
                      onClick={() => {
                        handleVerticalAlignClick("top")();
                        handleVerticalAlignClose();
                      }}
                      selected={nodes[0].data.verticalAlign === "top"}
                      sx={{ minWidth: "auto", m: 0, p: 1 }}
                    >
                      <VerticalAlignTopIcon />
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleVerticalAlignClick("center")();
                        handleVerticalAlignClose();
                      }}
                      selected={nodes[0].data.verticalAlign === "center"}
                      sx={{ minWidth: "auto", m: 0, p: 1 }}
                    >
                      <VerticalAlignCenterIcon />
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleVerticalAlignClick("bottom")();
                        handleVerticalAlignClose();
                      }}
                      selected={nodes[0].data.verticalAlign === "bottom"}
                      sx={{ minWidth: "auto", m: 0, p: 1 }}
                    >
                      <VerticalAlignBottomIcon />
                    </MenuItem>
                  </Stack>
                </Menu>
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
