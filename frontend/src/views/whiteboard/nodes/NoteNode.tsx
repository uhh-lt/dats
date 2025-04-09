import { Box, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { NodeProps, useReactFlow } from "reactflow";
import { NoteNodeData } from "../../../api/openapi/models/NoteNodeData.ts";
import BaseCardNode from "./BaseCardNode.tsx";

function NoteNode(props: NodeProps<NoteNodeData>) {
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
    console.log(value);
    reactFlowInstance.setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return {
            ...node,
            data: {
              ...node.data,
              text: value,
            },
          };
        }

        return node;
      }),
    );
    setIsEditing(false);
  };

  // Get font size from fontSize property
  const getFontSize = () => {
    if (props.data.fontSize) {
      return props.data.fontSize;
    }
    return "16px"; // Default size
  };

  return (
    <BaseCardNode
      allowDrawConnection={false}
      nodeProps={props}
      onClick={handleClick}
      backgroundColor={props.data.bgcolor + props.data.bgalpha?.toString(16).padStart(2, "0")}
      alignment={props.data.verticalAlign}
    >
      {isEditing ? (
        <Box className="nodrag">
          <TextField
            variant="outlined"
            defaultValue={props.data.text}
            onBlur={handleChangeText}
            onKeyDown={(event) => event.key === "Escape" && handleChangeText(event)}
            inputProps={{
              style: {
                fontSize: getFontSize(),
                fontFamily: props.data.fontFamily ?? "Arial",
                textDecoration: props.data.strikethrough ? "line-through" : "none",
              },
            }}
            multiline
            autoFocus
          />
        </Box>
      ) : (
        <Typography
          variant="body1"
          color={props.data.color}
          style={{
            textDecoration:
              [props.data.underline ? "underline" : "", props.data.strikethrough ? "line-through" : ""]
                .filter(Boolean)
                .join(" ") || "none",
            ...(props.data.italic && { fontStyle: "italic" }),
            ...(props.data.bold && { fontWeight: "bold" }),
            textAlign: props.data.horizontalAlign,
            width: "100%",
            fontSize: getFontSize(),
            fontFamily: props.data.fontFamily ?? "Arial",
          }}
          whiteSpace="pre-wrap"
        >
          {props.data.text}
        </Typography>
      )}
    </BaseCardNode>
  );
}

export default NoteNode;
