import DeleteIcon from "@mui/icons-material/Delete";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

import {
  Button,
  ButtonGroup,
  Divider,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Tooltip,
} from "@mui/material";
import React, { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Edge, EdgeMarker, MarkerType, useReactFlow } from "reactflow";
import { WhiteboardEdgeData_Input } from "../../../api/openapi/models/WhiteboardEdgeData_Input.ts";
import { WhiteboardEdgeType } from "../../../api/openapi/models/WhiteboardEdgeType.ts";
import { isDashed, isDotted } from "../edges/edgeUtils.ts";
import { DATSNodeData } from "../types/DATSNodeData.ts";
import BgColorTool from "./tools/BgColorTool.tsx";
import EdgeColorTool from "./tools/EdgeColorTool.tsx";
import FontColorTool from "./tools/FontColorTool.tsx";
import NumberTool from "./tools/NumberTool.tsx";
import TypographyVariantTool from "./tools/TypographyVariantTool.tsx";

const arrow2icon: Record<string, React.ReactElement> = {
  noarrow: <HorizontalRuleIcon />,
  arrow: <KeyboardArrowRightIcon />,
  arrowclosed: <PlayArrowIcon />,
};

const arrow2rotatedicon: Record<string, React.ReactElement> = {
  noarrow: <HorizontalRuleIcon style={{ transform: "rotate(180deg)" }} />,
  arrow: <KeyboardArrowRightIcon style={{ transform: "rotate(180deg)" }} />,
  arrowclosed: <PlayArrowIcon style={{ transform: "rotate(180deg)" }} />,
};

export interface EdgeEditMenuHandle {
  open: (edges: Edge<WhiteboardEdgeData_Input>[]) => void;
  close: () => void;
}

const EdgeEditMenu = forwardRef<EdgeEditMenuHandle>((_, ref) => {
  const reactFlowInstance = useReactFlow<DATSNodeData, WhiteboardEdgeData_Input>();
  const [edges, setEdges] = useState<Edge<WhiteboardEdgeData_Input>[]>([]);

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
  }));

  // methods
  const openMenu = (edges: Edge<WhiteboardEdgeData_Input>[]) => {
    // TODO: This is a workaround. It seems there is a bug in react-flow
    setEdges(edges.map((edge) => reactFlowInstance.getEdge(edge.id)!));
  };

  const closeMenu = () => {
    setEdges([]);
  };

  const updateEdges = useCallback(
    (updateFnc: (oldEdge: Edge<WhiteboardEdgeData_Input>) => Edge<WhiteboardEdgeData_Input>) => {
      const idsToCheck = new Set(edges.map((edge) => edge.id));
      const updatedEdges: Edge<WhiteboardEdgeData_Input>[] = [];
      reactFlowInstance.setEdges((edges) => {
        const newEdges = edges.map((edge) => {
          if (idsToCheck.has(edge.id)) {
            const newEdge = updateFnc(edge);
            updatedEdges.push(newEdge);
            idsToCheck.delete(edge.id);
            return newEdge;
          }

          return edge;
        });
        return newEdges;
      });
    },
    [edges, reactFlowInstance],
  );

  const handleTypeChange = (event: SelectChangeEvent<WhiteboardEdgeType>) => {
    updateEdges((oldEdge) => {
      return {
        ...oldEdge,
        ...(oldEdge.data && {
          data: {
            ...oldEdge.data,
            type: event.target.value as WhiteboardEdgeType,
          },
        }),
      };
    });
  };

  const handleColorChange = (color: string) => {
    updateEdges((oldEdge) => {
      return {
        ...oldEdge,
        style: {
          ...oldEdge.style,
          stroke: color,
        },
        ...(oldEdge.markerEnd && {
          markerEnd: {
            ...(oldEdge.markerEnd as EdgeMarker),
            color: color,
          },
        }),
        ...(oldEdge.markerStart && {
          markerStart: {
            ...(oldEdge.markerStart as EdgeMarker),
            color: color,
          },
        }),
      };
    });
  };

  const handleStrokeWidthChange = (strokeWidth: number) => {
    updateEdges((oldEdge) => {
      if (isDashed(oldEdge)) {
        return {
          ...oldEdge,
          style: {
            ...oldEdge.style,
            strokeWidth: strokeWidth,
            strokeDasharray: `${2 * strokeWidth} ${2 * strokeWidth}`,
          },
        };
      }
      if (isDotted(oldEdge)) {
        return {
          ...oldEdge,
          style: {
            ...oldEdge.style,
            strokeWidth: strokeWidth,
            strokeDasharray: `${strokeWidth} ${strokeWidth}`,
          },
        };
      }
      // if (isSolid(oldEdge))
      return {
        ...oldEdge,
        style: {
          ...oldEdge.style,
          strokeWidth: strokeWidth,
        },
      };
    });
  };

  const handleMarkerStartChange = (event: SelectChangeEvent) => {
    updateEdges((oldEdge) => {
      if (event.target.value === "noarrow") {
        return {
          ...oldEdge,
          markerStart: undefined,
        };
      } else {
        return {
          ...oldEdge,
          markerStart: {
            color: oldEdge.style?.stroke,
            type: event.target.value as MarkerType,
          },
        };
      }
    });
  };

  const handleMarkerEndChange = (event: SelectChangeEvent) => {
    updateEdges((oldEdge) => {
      if (event.target.value === "noarrow") {
        return {
          ...oldEdge,
          markerEnd: undefined,
        };
      } else {
        return {
          ...oldEdge,
          markerEnd: {
            color: oldEdge.style?.stroke,
            type: event.target.value as MarkerType,
          },
        };
      }
    });
  };

  const handleStrokeStyleChange = (borderStyle: "dashed" | "solid" | "dotted" | undefined) => {
    updateEdges((oldEdge) => {
      return {
        ...oldEdge,
        style: {
          ...oldEdge.style,
          strokeDasharray:
            borderStyle === "solid"
              ? undefined
              : borderStyle === "dashed"
                ? `${2 * (oldEdge.style!.strokeWidth! as number)} ${2 * (oldEdge.style!.strokeWidth! as number)}`
                : `${oldEdge.style!.strokeWidth! as number} ${oldEdge.style!.strokeWidth! as number}`,
        },
      };
    });
  };

  const handleAddTextClick = () => {
    updateEdges((oldEdge) => {
      return {
        ...oldEdge,
        ...(oldEdge.data && {
          data: {
            ...oldEdge.data,
            label: {
              ...oldEdge.data.label,
              text: "type here...",
            },
          },
        }),
      };
    });
  };

  const handleFontColorChange = (color: string) => {
    updateEdges((oldEdge) => {
      return {
        ...oldEdge,
        ...(oldEdge.data && {
          data: {
            ...oldEdge.data,
            label: {
              ...oldEdge.data.label,
              color: color,
            },
          },
        }),
      };
    });
  };

  const handleFontSizeChange = (fontSize: number) => {
    updateEdges((oldEdge) => {
      if (edges.some((edge) => edge.id === oldEdge.id) && oldEdge.data) {
        return {
          ...oldEdge,
          data: {
            ...oldEdge.data,
            type: oldEdge.data.type || "bezier",
            label: {
              ...oldEdge.data.label,
              fontSize,
            },
          },
        };
      }
      return oldEdge;
    });
  };

  const handleBGColorChange = (color: string) => {
    updateEdges((oldEdge) => {
      return {
        ...oldEdge,
        ...(oldEdge.data && {
          data: {
            ...oldEdge.data,
            label: {
              ...oldEdge.data.label,
              bgcolor: color,
            },
          },
        }),
      };
    });
  };

  const handleBGAlphaChange = (alpha: number) => {
    updateEdges((oldEdge) => {
      return {
        ...oldEdge,
        ...(oldEdge.data && {
          data: {
            ...oldEdge.data,
            label: {
              ...oldEdge.data.label,
              bgalpha: alpha,
            },
          },
        }),
      };
    });
  };

  const handleDeleteClick = () => {
    const edgeIds = edges.map((edge) => edge.id);
    reactFlowInstance.setEdges((edges) => edges.filter((edge) => edgeIds.indexOf(edge.id) === -1));
    closeMenu();
  };

  const handleStartSelectOpen = () => {
    setIsStartSelectOpen(true);
  };

  const handleStartSelectClose = () => {
    setIsStartSelectOpen(false);
  };

  const handleEndSelectOpen = () => {
    setIsEndSelectOpen(true);
  };

  const handleEndSelectClose = () => {
    setIsEndSelectOpen(false);
  };

  const getBorderStyle = (edge: Edge) => {
    if (!edge.style?.strokeDasharray) return "solid";
    const dashArray = edge.style.strokeDasharray.toString();
    return dashArray.split(",")[0] === dashArray.split(",")[1] ? "dotted" : "dashed";
  };

  return (
    <>
      {edges.length > 0 && (
        <Paper sx={{ p: 1, mb: 1, width: "fit-content" }}>
          <Stack direction="row" alignItems="center">
            <Tooltip title="Line start" arrow disableHoverListener={isStartSelectOpen}>
              <Select
                key={`markerStart-${edges[0].id}`}
                size="small"
                sx={{
                  mr: 0.5,
                  height: "32px",
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  "& .MuiSelect-select": {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 0.5,
                  },
                }}
                MenuProps={{
                  sx: {
                    "& .MuiPaper-root": {
                      boxShadow: 1,
                      marginTop: "8px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  },
                }}
                onOpen={handleStartSelectOpen}
                onClose={handleStartSelectClose}
                defaultValue={edges[0].markerStart ? (edges[0].markerStart as EdgeMarker).type : "noarrow"}
                onChange={handleMarkerStartChange}
              >
                {["noarrow", "arrow", "arrowclosed"].map((type) => (
                  <MenuItem key={type} value={type} sx={{ minWidth: "auto", m: 0, p: 1 }}>
                    {arrow2rotatedicon[type]}
                  </MenuItem>
                ))}
              </Select>
            </Tooltip>
            <Tooltip title="Line end" arrow disableHoverListener={isEndSelectOpen}>
              <Select
                key={`markerEnd-${edges[0].id}`}
                size="small"
                sx={{
                  mr: 1,
                  height: "32px",
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  "& .MuiSelect-select": {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 0.5,
                  },
                }}
                MenuProps={{
                  sx: {
                    "& .MuiPaper-root": {
                      boxShadow: 1,
                      marginTop: "8px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  },
                }}
                onOpen={handleEndSelectOpen}
                onClose={handleEndSelectClose}
                defaultValue={edges[0].markerEnd ? (edges[0].markerEnd as EdgeMarker).type : "noarrow"}
                onChange={handleMarkerEndChange}
              >
                {["noarrow", "arrow", "arrowclosed"].map((type) => (
                  <MenuItem key={type} value={type} sx={{ minWidth: "auto", m: 0, p: 1 }}>
                    {arrow2icon[type]}
                  </MenuItem>
                ))}
              </Select>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
            <EdgeColorTool
              key={`stroke-color-${edges[0].id}`}
              color={edges[0].style?.stroke || "#000000"}
              onColorChange={handleColorChange}
              borderStyle={getBorderStyle(edges[0])}
              onBorderStyleChange={handleStrokeStyleChange}
              edgeType={edges[0].data?.type || "bezier"}
              onEdgeTypeChange={handleTypeChange}
            />
            <NumberTool
              key={`stroke-width-${edges[0].id}`}
              value={edges[0].style?.strokeWidth as number | undefined}
              onValueChange={handleStrokeWidthChange}
              min={1}
              max={20}
            />
            {edges.every((edge) => edge.data?.label === undefined || edge.data?.label.text.trim() === "") && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
                <ButtonGroup size="small" className="nodrag" sx={{ mr: 1, bgcolor: "background.paper" }}>
                  <Button
                    variant="text"
                    sx={{
                      color: "black",
                      "&:hover": {
                        backgroundColor: "transparent",
                        color: "black",
                      },
                    }}
                    onClick={handleAddTextClick}
                  >
                    Add Text
                  </Button>
                </ButtonGroup>
              </>
            )}
            {edges.every(
              (edge) => edge.data && edge.data.label !== undefined && edge.data.label.text.trim().length > 0,
            ) && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
                <TypographyVariantTool
                  key={`variant-${edges[0].id}`}
                  variant={edges[0].data!.label.fontSize}
                  onVariantChange={handleFontSizeChange}
                />
                <FontColorTool
                  key={`font-color-${edges[0].id}`}
                  color={edges[0].data!.label.color}
                  onColorChange={handleFontColorChange}
                />
                <BgColorTool
                  key={`bg-color-${edges[0].id}`}
                  color={edges[0].data!.label.bgcolor}
                  value={edges[0].data!.label.bgalpha}
                  onColorChange={handleBGColorChange}
                  onValueChange={handleBGAlphaChange}
                />
              </>
            )}
            <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
            <ButtonGroup size="small" className="nodrag" sx={{ bgcolor: "background.paper" }}>
              <Button variant="text" onClick={handleDeleteClick} sx={{ color: "text.secondary" }}>
                <DeleteIcon />
              </Button>
            </ButtonGroup>
          </Stack>
        </Paper>
      )}
    </>
  );
});

export default EdgeEditMenu;
