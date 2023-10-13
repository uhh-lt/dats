import DeleteIcon from "@mui/icons-material/Delete";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import MovingIcon from "@mui/icons-material/Moving";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StraightIcon from "@mui/icons-material/Straight";
import TurnRightIcon from "@mui/icons-material/TurnRight";
import UTurnRightIcon from "@mui/icons-material/UTurnRight";

import {
  Button,
  ButtonGroup,
  Divider,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  TypographyVariant,
} from "@mui/material";
import React, { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Edge, EdgeMarker, MarkerType, useReactFlow } from "reactflow";
import { isDashed, isDotted } from "../edges/edgeUtils";
import { CustomEdgeData } from "../types/CustomEdgeData";
import ColorTool from "./tools/ColorTool";
import NumberTool from "./tools/NumberTool";
import SliderTool from "./tools/SliderTool";
import SolidDashedDottedTool from "./tools/SolidDashedDottedTool";
import TypographyVariantTool from "./tools/TypographyVariantTool";

interface EdgeEditMenuProps {}

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
  open: (edgeId: string) => void;
  close: () => void;
}

const EdgeEditMenu = forwardRef<EdgeEditMenuHandle, EdgeEditMenuProps>((_, ref) => {
  const reactFlowInstance = useReactFlow<any, CustomEdgeData>();

  const [edgeId, setEdgeId] = useState<string | null>(null);
  const [edge, setEdge] = useState<Edge<CustomEdgeData> | undefined>();

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
  }));

  // methods
  const openMenu = (edgeId: string) => {
    setEdgeId(edgeId);
    setEdge(reactFlowInstance.getEdge(edgeId));
  };

  const closeMenu = () => {
    setEdgeId(null);
    setEdge(undefined);
  };

  const updateEdge = useCallback(
    (edgeId: string | null, updateFnc: (oldEdge: Edge<CustomEdgeData>) => Edge<CustomEdgeData>) => {
      reactFlowInstance.setEdges((edges) => {
        const newEdges = edges.map((edge) => {
          if (edge.id === edgeId) {
            const newEdge = updateFnc(edge);
            setEdge(newEdge);
            return newEdge;
          }

          return edge;
        });
        return newEdges;
      });
    },
    [reactFlowInstance]
  );

  const handleTypeChange = (event: SelectChangeEvent<"smoothstep" | "bezier" | "simplebezier" | "straight">) => {
    updateEdge(edgeId, (oldEdge) => {
      return {
        ...oldEdge,
        ...(oldEdge.data && {
          data: {
            ...oldEdge.data,
            type: event.target.value as "smoothstep" | "bezier" | "simplebezier" | "straight",
          },
        }),
      };
    });
  };

  const handleColorChange = (color: string) => {
    updateEdge(edgeId, (oldEdge) => {
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
    updateEdge(edgeId, (oldEdge) => {
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
    updateEdge(edgeId, (oldEdge) => {
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
    updateEdge(edgeId, (oldEdge) => {
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
    updateEdge(edgeId, (oldEdge) => {
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

  const handleAddTextClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    updateEdge(edgeId, (oldEdge) => {
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
    updateEdge(edgeId, (oldEdge) => {
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

  const handleFontSizeChange = (variant: TypographyVariant) => {
    updateEdge(edgeId, (oldEdge) => {
      return {
        ...oldEdge,
        ...(oldEdge.data && {
          data: {
            ...oldEdge.data,
            label: {
              ...oldEdge.data.label,
              variant: variant,
            },
          },
        }),
      };
    });
  };

  const handleBGColorChange = (color: string) => {
    updateEdge(edgeId, (oldEdge) => {
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
    updateEdge(edgeId, (oldEdge) => {
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
    reactFlowInstance.setEdges((edges) => edges.filter((edge) => edge.id !== edgeId));
  };

  return (
    <>
      {edge !== undefined && (
        <Paper sx={{ p: 1 }}>
          <Stack direction="row" alignItems="center">
            <Select
              style={{ height: "32px" }}
              sx={{ mr: 0.5 }}
              size="small"
              key={`markerStart-${edgeId}`}
              defaultValue={edge.markerStart ? (edge.markerStart as EdgeMarker).type : "noarrow"}
              onChange={handleMarkerStartChange}
            >
              {["noarrow", "arrow", "arrowclosed"].map((type) => (
                <MenuItem key={type} value={type}>
                  {arrow2rotatedicon[type]}
                </MenuItem>
              ))}
            </Select>
            <Select
              style={{ height: "32px" }}
              sx={{ mr: 1 }}
              size="small"
              key={`markerEnd-${edgeId}`}
              defaultValue={edge.markerEnd ? (edge.markerEnd as EdgeMarker).type : "noarrow"}
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
              key={`stroke-color-${edgeId}`}
              caption="Edge:"
              color={edge.style?.stroke}
              onColorChange={handleColorChange}
            />
            <NumberTool
              key={`stroke-width-${edgeId}`}
              value={edge.style?.strokeWidth as number | undefined}
              onValueChange={handleStrokeWidthChange}
              min={1}
              max={20}
            />
            <SolidDashedDottedTool
              value={isDashed(edge) ? "dashed" : isDotted(edge) ? "dotted" : "solid"}
              onValueChange={handleStrokeStyleChange}
            />
            <Select
              style={{ height: "32px" }}
              sx={{ mr: 1 }}
              size="small"
              key={`type-${edgeId}`}
              defaultValue={edge.data?.type}
              onChange={handleTypeChange}
            >
              {["bezier", "simplebezier", "straight", "smoothstep"].map((type) => (
                <MenuItem key={type} value={type}>
                  {type2icon[type]}
                </MenuItem>
              ))}
            </Select>
            <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
            {edge.data?.label.text.trim() === "" ? (
              <ButtonGroup size="small" className="nodrag" sx={{ mr: 1, bgcolor: "background.paper" }}>
                <Button variant={!edge.style?.strokeDasharray ? "contained" : "outlined"} onClick={handleAddTextClick}>
                  AddText
                </Button>
              </ButtonGroup>
            ) : edge.data ? (
              <>
                <TypographyVariantTool
                  key={`variant-${edge.id}`}
                  variant={edge.data.label.variant}
                  onVariantChange={handleFontSizeChange}
                />
                <ColorTool
                  key={`font-color-${edge.id}`}
                  caption={undefined}
                  color={edge.data.label.color}
                  onColorChange={handleFontColorChange}
                />
                <ColorTool
                  key={`bg-color-${edge.id}`}
                  caption="BG:"
                  color={edge.data.label.bgcolor}
                  onColorChange={handleBGColorChange}
                />
                <SliderTool
                  key={`bg-alpha-${edge.id}`}
                  value={edge.data.label.bgalpha}
                  onValueChange={handleBGAlphaChange}
                />
              </>
            ) : null}
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
