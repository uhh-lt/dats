import { Box, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { NodeProps, useReactFlow } from "reactflow";
import { TextNodeData } from "../../../api/openapi/models/TextNodeData.ts";

export interface TextNodeComponentProps<T extends Partial<TextNodeData>> {
  nodeProps: NodeProps<T>;
}

export function TextNodeComponent<T extends Partial<TextNodeData>>({ nodeProps }: TextNodeComponentProps<T>) {
  // Edit Mode
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (event.detail >= 2) {
      setIsEditing(true);
    }
  };

  // Handle Text Change
  const reactFlowInstance = useReactFlow();
  const handleChangeText = (
    event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement, Element> | React.KeyboardEvent<HTMLDivElement>,
  ) => {
    // @ts-expect-error - value is always a string
    const value: string = event.target.value;

    reactFlowInstance.setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeProps.id) {
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

  const textStyle = {
    textDecoration:
      [nodeProps.data.underline ? "underline" : "", nodeProps.data.strikethrough ? "line-through" : ""]
        .filter(Boolean)
        .join(" ") || "none",
    ...(nodeProps.data.italic && { fontStyle: "italic" }),
    ...(nodeProps.data.bold && { fontWeight: "bold" }),
    textAlign: nodeProps.data.horizontalAlign,
    width: "100%",
    fontSize: nodeProps.data.fontSize ? nodeProps.data.fontSize : "16px",
    fontFamily: nodeProps.data.fontFamily ?? "Arial",
  };

  return (
    <div onClick={handleClick}>
      {isEditing ? (
        <Box className="nodrag">
          <TextField
            variant="outlined"
            defaultValue={nodeProps.data.text}
            onBlur={handleChangeText}
            onKeyDown={(event) => event.key === "Escape" && handleChangeText(event)}
            slotProps={{
              htmlInput: {
                style: textStyle,
              },
            }}
            multiline
            autoFocus
          />
        </Box>
      ) : (
        <Typography variant="body1" color={nodeProps.data.color} style={textStyle} whiteSpace="pre-wrap">
          {nodeProps.data.text}
        </Typography>
      )}
    </div>
  );
}
