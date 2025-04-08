import DeleteIcon from "@mui/icons-material/Delete";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import MovingIcon from "@mui/icons-material/Moving";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StraightIcon from "@mui/icons-material/Straight";
import TurnRightIcon from "@mui/icons-material/TurnRight";
import UTurnRightIcon from "@mui/icons-material/UTurnRight";

import { Button, ButtonGroup, Divider, MenuItem, Paper, Select, SelectChangeEvent, Stack } from "@mui/material";
import React, { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Edge, EdgeMarker, MarkerType, useReactFlow } from "reactflow";
import { WhiteboardEdgeData_Input } from "../../../api/openapi/models/WhiteboardEdgeData_Input.ts";
import { WhiteboardEdgeType } from "../../../api/openapi/models/WhiteboardEdgeType.ts";
import { isDashed, isDotted } from "../edges/edgeUtils.ts";
import { DATSNodeData } from "../types/DATSNodeData.ts";
import ColorTool from "./tools/ColorTool.tsx";
import NumberTool from "./tools/NumberTool.tsx";
import SliderTool from "./tools/SliderTool.tsx";
import SolidDashedDottedTool from "./tools/SolidDashedDottedTool.tsx";
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

const type2icon: Record<string, React.ReactElement> = {
  bezier: <MovingIcon />,
  simplebezier: <UTurnRightIcon style={{ transform: "rotate(270deg)" }} />,
  straight: <StraightIcon style={{ transform: "rotate(90deg)" }} />,
  smoothstep: <TurnRightIcon />,
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

  return (
    <>
      {edges.length > 0 && (
        <Paper sx={{ p: 1, mb: 1, width: "fit-content" }}>
          <Stack direction="row" alignItems="center">
            <Select
              key={`markerStart-${edges[0].id}`}
              style={{ height: "32px" }}
              sx={{ mr: 0.5 }}
              size="small"
              defaultValue={edges[0].markerStart ? (edges[0].markerStart as EdgeMarker).type : "noarrow"}
              onChange={handleMarkerStartChange}
            >
              {["noarrow", "arrow", "arrowclosed"].map((type) => (
                <MenuItem key={type} value={type}>
                  {arrow2rotatedicon[type]}
                </MenuItem>
              ))}
            </Select>
            <Select
              key={`markerEnd-${edges[0].id}`}
              style={{ height: "32px" }}
              sx={{ mr: 1 }}
              size="small"
              defaultValue={edges[0].markerEnd ? (edges[0].markerEnd as EdgeMarker).type : "noarrow"}
              onChange={handleMarkerEndChange}
            >
              {["noarrow", "arrow", "arrowclosed"].map((type) => (
                <MenuItem key={type} value={type}>
                  {arrow2icon[type]}
                </MenuItem>
              ))}
            </Select>
            <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
            <ColorTool
              key={`stroke-color-${edges[0].id}`}
              caption="Edge:"
              color={edges[0].style?.stroke}
              onColorChange={handleColorChange}
            />
            <NumberTool
              key={`stroke-width-${edges[0].id}`}
              value={edges[0].style?.strokeWidth as number | undefined}
              onValueChange={handleStrokeWidthChange}
              min={1}
              max={20}
            />
            <SolidDashedDottedTool
              key={`stroke-style-${edges[0].id}`}
              value={isDashed(edges[0]) ? "dashed" : isDotted(edges[0]) ? "dotted" : "solid"}
              onValueChange={handleStrokeStyleChange}
            />
            <Select
              key={`type-${edges[0].id}`}
              style={{ height: "32px" }}
              sx={{ mr: 1 }}
              size="small"
              defaultValue={edges[0].data?.type}
              onChange={handleTypeChange}
            >
              {Object.values(WhiteboardEdgeType).map((type) => (
                <MenuItem key={type} value={type}>
                  {type2icon[type]}
                </MenuItem>
              ))}
            </Select>
            {edges.every((edge) => edge.data?.label === undefined || edge.data?.label.text.trim() === "") && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
                <ButtonGroup size="small" className="nodrag" sx={{ mr: 1, bgcolor: "background.paper" }}>
                  <Button
                    variant={!edges[0].style?.strokeDasharray ? "contained" : "outlined"}
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
                <ColorTool
                  key={`font-color-${edges[0].id}`}
                  caption={undefined}
                  color={edges[0].data!.label.color}
                  onColorChange={handleFontColorChange}
                />
                <ColorTool
                  key={`bg-color-${edges[0].id}`}
                  caption="BG:"
                  color={edges[0].data!.label.bgcolor}
                  onColorChange={handleBGColorChange}
                />
                <SliderTool
                  key={`bg-alpha-${edges[0].id}`}
                  value={edges[0].data!.label.bgalpha || 0}
                  onValueChange={handleBGAlphaChange}
                />
              </>
            )}
            <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
            <ButtonGroup size="small" className="nodrag" sx={{ bgcolor: "background.paper" }}>
              <Button onClick={handleDeleteClick}>
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
