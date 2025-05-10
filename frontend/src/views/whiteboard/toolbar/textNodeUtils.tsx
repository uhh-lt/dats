import { Box, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { NodeProps } from "reactflow";
import { TextNodeData } from "../../../api/openapi/models/TextNodeData.ts";

export interface TextNodeComponentProps<T extends Partial<TextNodeData>> {
  nodeProps: NodeProps<T>;
  onTextChange: (value: string) => void;
}

export function TextNodeComponent<T extends Partial<TextNodeData>>({
  nodeProps,
  onTextChange,
}: TextNodeComponentProps<T>) {
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (event.detail >= 2) {
      setIsEditing(true);
    }
  };

  const handleChangeText = (
    event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement, Element> | React.KeyboardEvent<HTMLDivElement>,
  ) => {
    // @ts-expect-error - value is always a string
    const value: string = event.target.value;
    onTextChange(value);
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
            inputProps={{
              style: textStyle,
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
