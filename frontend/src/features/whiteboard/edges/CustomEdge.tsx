import { Box, TextField, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
  useReactFlow,
} from "reactflow";
import { WhiteboardEdgeData_Input } from "../../../api/openapi/models/WhiteboardEdgeData_Input.ts";

const useGetPath = (edge: EdgeProps<WhiteboardEdgeData_Input>): [string, number, number] => {
  const [edgePath, labelX, labelY] = useMemo(() => {
    switch (edge.data?.type) {
      case "bezier":
        return getBezierPath(edge);
      case "simplebezier":
        return getSimpleBezierPath(edge);
      case "straight":
        return getStraightPath(edge);
      case "smoothstep":
        return getSmoothStepPath(edge);
      default:
        return getStraightPath(edge);
    }
  }, [edge]);

  return [edgePath, labelX, labelY];
};

export function CustomEdge(props: EdgeProps<WhiteboardEdgeData_Input>) {
  const [edgePath, labelX, labelY] = useGetPath(props);
  const reactFlowInstance = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (event.detail >= 2) {
      setIsEditing(true);
    }
  };

  const handleChangeText = (
    event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement, Element> | React.KeyboardEvent<HTMLDivElement>,
  ) => {
    // @ts-expect-error event target value is always a string
    const value: string = event.target.value;
    reactFlowInstance.setEdges((edges) =>
      edges.map((edge) => {
        if (edge.id === props.id) {
          return {
            ...edge,
            data: {
              ...edge.data,
              label: {
                ...edge.data.label,
                text: value,
              },
            },
          };
        }

        return edge;
      }),
    );
    setIsEditing(false);
  };

  return (
    <>
      <BaseEdge path={edgePath} {...props} />
      {props.data && props.data?.label.text.trim() !== "" && (
        <EdgeLabelRenderer>
          <Box
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              backgroundColor: props.data.label.bgcolor + props.data.label.bgalpha?.toString(16).padStart(2, "0"),
              padding: 10,
              borderRadius: 5,
              fontWeight: 700,
              alignItems:
                props.data.label.verticalAlign === "center"
                  ? "center"
                  : props.data.label.verticalAlign === "bottom"
                    ? "flex-end"
                    : "flex-start",
              pointerEvents: "all",
            }}
            onClick={handleClick}
          >
            {isEditing ? (
              <Box className="nodrag">
                <TextField
                  variant="outlined"
                  defaultValue={props.data.label.text}
                  onBlur={handleChangeText}
                  onKeyDown={(event) => event.key === "Escape" && handleChangeText(event)}
                  slotProps={{ htmlInput: { style: { fontSize: `${props.data.label.fontSize}px` } } }}
                  multiline
                  autoFocus
                />
              </Box>
            ) : (
              <Typography
                variant="body1"
                color={props.data.label.color}
                style={{
                  ...(props.data.label.italic && { fontStyle: "italic" }),
                  ...(props.data.label.bold && { fontWeight: "bold" }),
                  ...(props.data.label.underline && { textDecoration: "underline" }),
                  textAlign: props.data.label.horizontalAlign,
                  width: "100%",
                  fontSize: `${props.data.label.fontSize}px`,
                }}
                whiteSpace="pre-wrap"
              >
                {props.data.label.text}
              </Typography>
            )}
          </Box>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
