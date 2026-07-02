import { WhiteboardEdgeType } from "@models/WhiteboardEdgeType";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button, ButtonGroup, Divider, Paper, SelectChangeEvent, Stack } from "@mui/material";
import { Edge, EdgeMarker, MarkerType, useReactFlow } from "@xyflow/react";
import { Ref, useCallback, useImperativeHandle, useState } from "react";
import { StrokeStyle } from "../../_types/base/StrokeStyle";
import { DATSNode } from "../../_types/DATSNode";
import { CustomEdge } from "../edges";
import { isDashed, isDotted } from "../edgeUtils";
import { BgColorTool } from "./tools/BgColorTool";
import { EdgeMarkerTool } from "./tools/EdgeMarkerTool";
import { EdgeStyleTool } from "./tools/EdgeStyleTool";
import { FontColorTool } from "./tools/FontColorTool";
import { NumberTool } from "./tools/NumberTool";

export interface EdgeEditMenuHandle {
  open: (edges: CustomEdge[]) => void;
  close: () => void;
}

interface EdgeEditMenuProps {
  ref: Ref<EdgeEditMenuHandle>;
}

export const EdgeEditMenu = ({ ref }: EdgeEditMenuProps) => {
  const reactFlowInstance = useReactFlow<DATSNode, CustomEdge>();
  const [edges, setEdges] = useState<CustomEdge[]>([]);

  // methods
  const openMenu = (edges: CustomEdge[]) => {
    // TODO: This is a workaround. It seems there is a bug in react-flow
    setEdges(edges.map((edge) => reactFlowInstance.getEdge(edge.id)!));
  };

  const closeMenu = () => {
    setEdges([]);
  };

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
  }));

  const updateEdges = useCallback(
    (updateFnc: (oldEdge: CustomEdge) => CustomEdge) => {
      const idsToCheck = new Set(edges.map((edge) => edge.id));
      const updatedEdges: CustomEdge[] = [];
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
      return {
        ...oldEdge,
        markerStart: {
          type: event.target.value as MarkerType,
          color: oldEdge.style?.stroke || "#000000",
        },
      };
    });
  };

  const handleMarkerEndChange = (event: SelectChangeEvent) => {
    updateEdges((oldEdge) => {
      return {
        ...oldEdge,
        markerEnd: {
          type: event.target.value as MarkerType,
          color: oldEdge.style?.stroke || "#000000",
        },
      };
    });
  };

  const handleStrokeStyleChange = (strokeStyle: "dashed" | "solid" | "dotted" | undefined) => {
    updateEdges((oldEdge) => {
      return {
        ...oldEdge,
        style: {
          ...oldEdge.style,
          strokeDasharray:
            strokeStyle === "solid"
              ? undefined
              : strokeStyle === "dashed"
                ? `${2 * (oldEdge.style!.strokeWidth! as number)} ${oldEdge.style!.strokeWidth! as number}`
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

  const getStrokeStyle = (edge: Edge) => {
    if (!edge.style?.strokeDasharray) return StrokeStyle.SOLID;
    const dashArray = edge.style.strokeDasharray.toString();
    return dashArray.split(" ")[0] === dashArray.split(" ")[1] ? StrokeStyle.DOTTED : StrokeStyle.DASHED;
  };

  return (
    <>
      {edges.length > 0 && (
        <Paper sx={{ p: 1, width: "fit-content" }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <EdgeMarkerTool
              markerStart={edges[0].markerStart as EdgeMarker}
              markerEnd={edges[0].markerEnd as EdgeMarker}
              onMarkerStartChange={handleMarkerStartChange}
              onMarkerEndChange={handleMarkerEndChange}
            />
            <Divider orientation="vertical" flexItem />
            <EdgeStyleTool
              key={`stroke-color-${edges[0].id}`}
              color={edges[0].style?.stroke || "#000000"}
              onColorChange={handleColorChange}
              strokeStyle={getStrokeStyle(edges[0])}
              onStrokeStyleChange={handleStrokeStyleChange}
              edgeType={edges[0].data?.type || WhiteboardEdgeType.BEZIER}
              onEdgeTypeChange={handleTypeChange}
            />
            <NumberTool
              tooltip="Edge size"
              key={`stroke-width-${edges[0].id}`}
              value={(edges[0].style?.strokeWidth as number | undefined) || 1}
              onValueChange={handleStrokeWidthChange}
              min={1}
              max={20}
            />
            {edges.every((edge) => edge.data?.label === undefined || edge.data?.label.text.trim() === "") && (
              <>
                <Divider orientation="vertical" flexItem />
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
                <Divider orientation="vertical" flexItem />
                <NumberTool
                  tooltip="Font size"
                  key={`font-size-${edges[0].id}`}
                  value={edges[0].data!.label.fontSize || 1}
                  onValueChange={handleFontSizeChange}
                  min={8}
                  max={72}
                />
                <FontColorTool
                  key={`font-color-${edges[0].id}`}
                  color={edges[0].data!.label.color}
                  onColorChange={handleFontColorChange}
                />
                <BgColorTool
                  key={`edge-color-${edges[0].id}`}
                  color={edges[0].data!.label.bgcolor}
                  alpha={edges[0].data!.label.bgalpha}
                  onColorChange={handleBGColorChange}
                  onAlphaChange={handleBGAlphaChange}
                />
              </>
            )}
            <Divider orientation="vertical" flexItem />
            <Button
              size="small"
              variant="text"
              onClick={handleDeleteClick}
              sx={{ color: "text.secondary", minWidth: 0 }}
            >
              <DeleteIcon />
            </Button>
          </Stack>
        </Paper>
      )}
    </>
  );
};
