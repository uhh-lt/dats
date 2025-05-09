import DeleteIcon from "@mui/icons-material/Delete";
import { Button, ButtonGroup, Divider, Paper, SelectChangeEvent, Stack } from "@mui/material";
import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Edge, EdgeMarker, MarkerType, useReactFlow } from "reactflow";
import { WhiteboardEdgeData_Input } from "../../../api/openapi/models/WhiteboardEdgeData_Input.ts";
import { WhiteboardEdgeType } from "../../../api/openapi/models/WhiteboardEdgeType.ts";
import { isDashed, isDotted } from "../edges/edgeUtils.ts";
import { DATSNodeData } from "../types/DATSNodeData.ts";
import BgColorTool from "./tools/BgColorTool.tsx";
import EdgeColorTool from "./tools/EdgeColorTool.tsx";
import EdgeMarkerTool from "./tools/EdgeMarkerTool.tsx";
import FontColorTool from "./tools/FontColorTool.tsx";
import FontSizeTool from "./tools/FontSizeTool.tsx";
import NumberTool from "./tools/NumberTool.tsx";

export interface EdgeEditMenuHandle {
  open: (edges: Edge<WhiteboardEdgeData_Input>[]) => void;
  close: () => void;
}

const EdgeEditMenu = forwardRef<EdgeEditMenuHandle>((_, ref) => {
  const reactFlowInstance = useReactFlow<DATSNodeData, WhiteboardEdgeData_Input>();
  const [edges, setEdges] = useState<Edge<WhiteboardEdgeData_Input>[]>([]);
  const [isStartSelectOpen, setIsStartSelectOpen] = useState(false);
  const [isEndSelectOpen, setIsEndSelectOpen] = useState(false);
  const [isStartTooltipOpen, setIsStartTooltipOpen] = useState(false);
  const [isEndTooltipOpen, setIsEndTooltipOpen] = useState(false);

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

  const handleTypeChange = (type: WhiteboardEdgeType) => {
    updateEdges((oldEdge) => {
      return {
        ...oldEdge,
        ...(oldEdge.data && {
          data: {
            ...oldEdge.data,
            type: type,
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
    setIsStartTooltipOpen(false);
  };

  const handleStartSelectClose = () => {
    setIsStartSelectOpen(false);
  };

  const handleEndSelectOpen = () => {
    setIsEndSelectOpen(true);
    setIsEndTooltipOpen(false);
  };

  const handleEndSelectClose = () => {
    setIsEndSelectOpen(false);
  };

  const handleStartTooltipOpen = () => {
    if (!isStartSelectOpen) {
      setIsStartTooltipOpen(true);
    }
  };

  const handleStartTooltipClose = () => {
    setIsStartTooltipOpen(false);
  };

  const handleEndTooltipOpen = () => {
    if (!isEndSelectOpen) {
      setIsEndTooltipOpen(true);
    }
  };

  const handleEndTooltipClose = () => {
    setIsEndTooltipOpen(false);
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
            <EdgeMarkerTool
              markerStart={edges[0].markerStart as EdgeMarker}
              markerEnd={edges[0].markerEnd as EdgeMarker}
              onMarkerStartChange={handleMarkerStartChange}
              onMarkerEndChange={handleMarkerEndChange}
              onStartSelectOpen={handleStartSelectOpen}
              onStartSelectClose={handleStartSelectClose}
              onEndSelectOpen={handleEndSelectOpen}
              onEndSelectClose={handleEndSelectClose}
              isStartTooltipOpen={isStartTooltipOpen}
              isEndTooltipOpen={isEndTooltipOpen}
              onStartTooltipOpen={handleStartTooltipOpen}
              onStartTooltipClose={handleStartTooltipClose}
              onEndTooltipOpen={handleEndTooltipOpen}
              onEndTooltipClose={handleEndTooltipClose}
            />
            <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
            <EdgeColorTool
              key={`stroke-color-${edges[0].id}`}
              color={edges[0].style?.stroke || "#000000"}
              onColorChange={handleColorChange}
              borderStyle={getBorderStyle(edges[0])}
              onBorderStyleChange={handleStrokeStyleChange}
              edgeType={edges[0].data?.type || WhiteboardEdgeType.BEZIER}
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
                <FontSizeTool
                  key={`size-${edges[0].id}`}
                  size={edges[0].data!.label.fontSize}
                  onSizeChange={handleFontSizeChange}
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
