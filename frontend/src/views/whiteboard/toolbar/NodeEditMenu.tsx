import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import StrikethroughSIcon from "@mui/icons-material/StrikethroughS";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import VerticalAlignCenterIcon from "@mui/icons-material/VerticalAlignCenter";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";

import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import {
  Box,
  Button,
  ButtonGroup,
  Divider,
  FormControl,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Node, useReactFlow } from "reactflow";
import { BackgroundColorData } from "../types/base/BackgroundColorData.ts";
import { BorderData } from "../types/base/BorderData.ts";
import { TextData } from "../types/base/TextData.ts";
import { BorderNodeData } from "../types/customnodes/BorderNodeData.ts";
import { NoteNodeData } from "../types/customnodes/NoteNodeData.ts";
import { hasTextData, isBackgroundColorDataArray, isBorderDataArray, isTextDataArray } from "../types/typeGuards.ts";
import BgColorTool from "./tools/BgColorTool.tsx";
import BorderColorTool from "./tools/BorderColorTool.tsx";
import ColorTool from "./tools/ColorTool.tsx";
import NumberTool from "./tools/NumberTool.tsx";
import TypographyVariantTool from "./tools/TypographyVariantTool.tsx";

export interface NodeEditMenuHandle {
  open: (nodes: Node[]) => void;
  close: () => void;
}

// Define predefined font families
const FONT_FAMILIES = ["Arial", "Times New Roman", "Courier New", "Verdana", "Georgia"];

const NodeEditMenu = forwardRef<NodeEditMenuHandle>((_, ref) => {
  const reactFlowInstance = useReactFlow<BackgroundColorData | TextData | BorderData>();
  const [nodes, setNodes] = useState<Node<BackgroundColorData | TextData | BorderData>[]>([]);
  const [textStyleAnchor, setTextStyleAnchor] = useState<null | HTMLElement>(null);
  const [alignAnchor, setAlignAnchor] = useState<null | HTMLElement>(null);
  const [isFontFamilyMenuOpen, setIsFontFamilyMenuOpen] = useState<boolean>(false);
  const [changeNodeAnchor, setChangeNodeAnchor] = useState<null | HTMLElement>(null);
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
        oldNode: Node<BackgroundColorData | TextData | BorderData | BorderNodeData | NoteNodeData>,
      ) => Node<BackgroundColorData | TextData | BorderData | BorderNodeData | NoteNodeData>,
    ) => {
      const idsToCheck = new Set(nodes.map((node) => node.id));
      const updatedNodes: Node<BackgroundColorData | TextData | BorderData | BorderNodeData | NoteNodeData>[] = [];
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

  const handleStyleClick = (style: "bold" | "italic" | "underline" | "strikethrough") => () => {
    updateNodes((oldNode) => {
      if (hasTextData(oldNode)) {
        return {
          ...oldNode,
          data: {
            ...oldNode.data,
            ...(style === "bold" && { bold: !oldNode.data.bold }),
            ...(style === "italic" && { italic: !oldNode.data.italic }),
            ...(style === "underline" && { underline: !oldNode.data.underline }),
            ...(style === "strikethrough" && { strikethrough: !oldNode.data.strikethrough }),
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
          fontFamily: fontFamily, // Assumes TextData has fontFamily
        },
      };
    });
  };

  const handleChangeNodeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setChangeNodeAnchor(event.currentTarget);
  };

  const handleChangeNodeMenuClose = () => {
    setChangeNodeAnchor(null);
  };

  // Helper to extract a property from an object, or return a default value if the property is undefined
  function getOrDefault<T, K extends keyof T>(obj: Partial<T>, key: K, defaultValue: T[K]): T[K] {
    return obj[key] !== undefined ? obj[key]! : defaultValue;
  }

  const changeNodeType = (nodeType: string) => {
    updateNodes((oldNode) => {
      const oldData = oldNode.data as Partial<TextData & NoteNodeData & BorderNodeData>;

      // Get common properties that might exist in the current node
      const commonProps = {
        text: getOrDefault(oldData, "text", "New Text"),
        color: getOrDefault(oldData, "color", "#000000"),
        fontSize: getOrDefault(oldData, "fontSize", 12),
        fontFamily: getOrDefault(oldData, "fontFamily", "Arial"),
        horizontalAlign: getOrDefault(oldData, "horizontalAlign", "left"),
        verticalAlign: getOrDefault(oldData, "verticalAlign", "top"),
        bold: getOrDefault(oldData, "bold", false),
        italic: getOrDefault(oldData, "italic", false),
        underline: getOrDefault(oldData, "underline", false),
        strikethrough: getOrDefault(oldData, "strikethrough", false),
      };

      // console.log("commonProps", commonProps); // Debugging log for commonProps

      // Create new data based on node type
      let newData;
      switch (nodeType) {
        case "text": {
          newData = {
            ...commonProps,
          };
          break;
        }
        case "note": {
          newData = {
            ...commonProps,
            bgcolor: getOrDefault(oldData, "bgcolor", "#ffffff"),
            bgalpha: getOrDefault(oldData, "bgalpha", 255),
          };
          break;
        }
        case "ellipse": {
          newData = {
            ...commonProps,
            bgcolor: getOrDefault(oldData, "bgcolor", "#ffffff"),
            bgalpha: getOrDefault(oldData, "bgalpha", 255),
            borderRadius: "100%",
            borderColor: getOrDefault(oldData, "borderColor", "#000000"),
            borderWidth: getOrDefault(oldData, "borderWidth", 1),
            borderStyle: getOrDefault(oldData, "borderStyle", "solid"),
            width: 200,
            height: 200,
          };
          break;
        }
        case "rectangle": {
          newData = {
            ...commonProps,
            bgcolor: getOrDefault(oldData, "bgcolor", "#ffffff"),
            bgalpha: getOrDefault(oldData, "bgalpha", 255),
            borderColor: getOrDefault(oldData, "borderColor", "#000000"),
            borderWidth: getOrDefault(oldData, "borderWidth", 1),
            borderStyle: getOrDefault(oldData, "borderStyle", "solid"),
            borderRadius: "0px",
            width: 200,
            height: 200,
          };
          break;
        }
        case "rounded": {
          newData = {
            ...commonProps,
            bgcolor: getOrDefault(oldData, "bgcolor", "#ffffff"),
            bgalpha: getOrDefault(oldData, "bgalpha", 255),
            borderColor: getOrDefault(oldData, "borderColor", "#000000"),
            borderWidth: getOrDefault(oldData, "borderWidth", 1),
            borderStyle: getOrDefault(oldData, "borderStyle", "solid"),
            borderRadius: "25px",
            width: 200,
            height: 200,
          };
          break;
        }
        default: {
          newData = commonProps;
          break;
        }
      }

      return {
        ...oldNode,
        type: nodeType === "ellipse" || nodeType === "rectangle" || nodeType === "rounded" ? "border" : nodeType,
        data: newData,
        ...(nodeType === "ellipse" || nodeType === "rectangle" || nodeType === "rounded"
          ? { width: 200, height: 200 }
          : {}),
        position: {
          x: oldNode.position.x,
          y: oldNode.position.y,
        },
      };
    });
    handleChangeNodeMenuClose();
  };

  return (
    <>
      {nodes.length > 0 && (
        <Paper sx={{ py: 0.8, px: 0.5, mb: 1, width: "fit-content" }}>
          <Stack direction="row" alignItems="center">
            <Tooltip title="Change Node Type" arrow disableHoverListener={Boolean(changeNodeAnchor)}>
              <IconButton
                size="large"
                sx={{ color: "black", mr: 1, "&:hover": { color: "black", backgroundColor: "transparent" } }}
                onClick={handleChangeNodeMenuOpen}
              >
                <CheckBoxOutlineBlankIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={changeNodeAnchor}
              open={Boolean(changeNodeAnchor)}
              onClose={handleChangeNodeMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "center",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "center",
              }}
              sx={{
                "& .MuiPaper-root": { boxShadow: 1, mt: 1.8 },
              }}
            >
              <MenuItem onClick={() => changeNodeType("text")}>Text</MenuItem>
              <MenuItem onClick={() => changeNodeType("note")}>Note</MenuItem>
              <MenuItem onClick={() => changeNodeType("ellipse")}>Ellipse</MenuItem>
              <MenuItem onClick={() => changeNodeType("rectangle")}>Rectangle</MenuItem>
              <MenuItem onClick={() => changeNodeType("rounded")}>Rounded</MenuItem>
              <Typography variant="body1">All Node Types</Typography>
            </Menu>
            {showTextTools && (
              <>
                {/* Font Family Selector */}
                <Tooltip title="Font Family" arrow disableHoverListener={isFontFamilyMenuOpen}>
                  <FormControl size="small" sx={{ mr: 1, minWidth: 120 }}>
                    <Select
                      value={currentFontFamily}
                      onChange={handleFontFamilyChange}
                      displayEmpty
                      inputProps={{ "aria-label": "Font Family" }}
                      sx={{
                        fontSize: "0.8rem",
                        "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                      }}
                      MenuProps={{
                        sx: {
                          "& .MuiPaper-root": {
                            boxShadow: 1,
                            marginTop: "8px",
                          },
                        },
                      }}
                      onOpen={() => setIsFontFamilyMenuOpen(true)}
                      onClose={() => setIsFontFamilyMenuOpen(false)}
                    >
                      {currentFontFamily === "" && (
                        <MenuItem value="" disabled>
                          <em>Multiple Fonts</em>
                        </MenuItem>
                      )}
                      {FONT_FAMILIES.map((font) => (
                        <MenuItem key={font} value={font} sx={{ fontFamily: font, fontSize: "0.9rem" }}>
                          {font}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Tooltip>
                <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />

                <TypographyVariantTool
                  key={`variant-${nodes[0].id}`}
                  variant={nodes[0].data.fontSize}
                  onVariantChange={handleFontSizeChange}
                />
                <ColorTool
                  caption={undefined}
                  key={`font-color-${nodes[0].id}`}
                  color={nodes[0].data.color}
                  onColorChange={handleColorChange}
                />
                <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
                <Tooltip title="Text style" arrow disableHoverListener={Boolean(textStyleAnchor)}>
                  <Box>
                    <Button
                      variant="text"
                      size="small"
                      onClick={handleTextStyleClick}
                      sx={{ minWidth: 0, color: "black" }}
                    >
                      <FormatBoldIcon />
                    </Button>
                  </Box>
                </Tooltip>
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
                    "& .MuiPaper-root": { boxShadow: 1, mt: 1.8 },
                    "& .MuiList-root": { p: 0 },
                  }}
                >
                  <Stack direction="row">
                    <MenuItem
                      onClick={() => {
                        handleStyleClick("bold")();
                        handleTextStyleClose();
                      }}
                      selected={showTextTools && (nodes[0]?.data as TextData)?.bold}
                      sx={{ minWidth: "auto", m: 0, p: 1 }}
                    >
                      <FormatBoldIcon />
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleStyleClick("italic")();
                        handleTextStyleClose();
                      }}
                      selected={showTextTools && (nodes[0]?.data as TextData)?.italic}
                      sx={{ minWidth: "auto", m: 0, p: 1 }}
                    >
                      <FormatItalicIcon />
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleStyleClick("underline")();
                        handleTextStyleClose();
                      }}
                      selected={showTextTools && (nodes[0]?.data as TextData)?.underline}
                      sx={{ minWidth: "auto", m: 0, p: 1 }}
                    >
                      <FormatUnderlinedIcon />
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleStyleClick("strikethrough")();
                        handleTextStyleClose();
                      }}
                      selected={showTextTools && (nodes[0]?.data as TextData)?.strikethrough}
                      sx={{ minWidth: "auto", m: 0, p: 1 }}
                    >
                      <StrikethroughSIcon />
                    </MenuItem>
                  </Stack>
                </Menu>
                <ButtonGroup size="small" className="nodrag" sx={{ bgcolor: "background.paper" }}>
                  <Tooltip title="Text alignment" arrow disableHoverListener={Boolean(alignAnchor)}>
                    <Box>
                      <Button variant="text" onClick={handleAlignClick} sx={{ minWidth: 0, color: "black" }}>
                        {showTextTools ? getAlignIcon() : <FormatAlignLeftIcon />}
                      </Button>
                    </Box>
                  </Tooltip>
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
                      marginTop: 1.5,
                      elevation: 1,
                      boxShadow: 1,
                    },
                    "& .MuiList-root": {
                      padding: 0,
                    },
                  }}
                >
                  <Stack direction="column" spacing={1} sx={{ p: 0.5 }}>
                    <Stack direction="row" spacing={1}>
                      <MenuItem
                        onClick={() => {
                          handleHorizontalAlignClick("left")();
                          handleAlignClose();
                        }}
                        sx={{ minWidth: "auto", m: 0, p: 1 }}
                      >
                        <FormatAlignLeftIcon />
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          handleHorizontalAlignClick("center")();
                          handleAlignClose();
                        }}
                        sx={{ minWidth: "auto", m: 0, p: 1 }}
                      >
                        <FormatAlignCenterIcon />
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          handleHorizontalAlignClick("right")();
                          handleAlignClose();
                        }}
                        sx={{ minWidth: "auto", m: 0, p: 1 }}
                      >
                        <FormatAlignRightIcon />
                      </MenuItem>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <MenuItem
                        onClick={() => {
                          handleVerticalAlignClick("top")();
                          handleAlignClose();
                        }}
                        sx={{ minWidth: "auto", m: 0, p: 1 }}
                      >
                        <VerticalAlignTopIcon />
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          handleVerticalAlignClick("center")();
                          handleAlignClose();
                        }}
                        sx={{ minWidth: "auto", m: 0, p: 1 }}
                      >
                        <VerticalAlignCenterIcon />
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          handleVerticalAlignClick("bottom")();
                          handleAlignClose();
                        }}
                        sx={{ minWidth: "auto", m: 0, p: 1 }}
                      >
                        <VerticalAlignBottomIcon />
                      </MenuItem>
                    </Stack>
                  </Stack>
                </Menu>
              </>
            )}
            {showBackgroundColorTools && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
                <BgColorTool
                  key={`bg-color-${nodes[0].id}`}
                  color={nodes[0].data.bgcolor}
                  value={nodes[0].data.bgalpha}
                  onColorChange={handleBGColorChange}
                  onValueChange={handleBGAlphaChange}
                />
              </>
            )}
            {showBorderTools && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
                <BorderColorTool
                  key={`bordercolor-${nodes[0].id}`}
                  color={nodes[0].data.borderColor}
                  onColorChange={handleBorderColorChange}
                  borderStyle={nodes[0].data.borderStyle}
                  onBorderStyleChange={handleBorderStyleChange}
                />
                <NumberTool
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

export default NodeEditMenu;
