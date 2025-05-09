import { Box, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { NodeProps } from "reactflow";

interface TextNodeData {
  text: string;
  color?: string;
  fontSize?: number | string;
  fontFamily?: string;
  underline?: boolean;
  strikethrough?: boolean;
  italic?: boolean;
  bold?: boolean;
  horizontalAlign?: "left" | "center" | "right" | "justify";
  verticalAlign?: string;
  bgcolor?: string;
  bgalpha?: number | null;
}

interface TextNodeProps<T extends TextNodeData> {
  nodeProps: NodeProps<T>;
  onTextChange: (value: string) => void;
  renderContainer: (children: React.ReactNode) => React.ReactNode;
}

export function useTextNode<T extends TextNodeData>(props: TextNodeProps<T>) {
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
    props.onTextChange(value);
    setIsEditing(false);
  };

  const textStyle = {
    textDecoration:
      [props.nodeProps.data.underline ? "underline" : "", props.nodeProps.data.strikethrough ? "line-through" : ""]
        .filter(Boolean)
        .join(" ") || "none",
    ...(props.nodeProps.data.italic && { fontStyle: "italic" }),
    ...(props.nodeProps.data.bold && { fontWeight: "bold" }),
    textAlign: props.nodeProps.data.horizontalAlign,
    width: "100%",
    fontSize: props.nodeProps.data.fontSize ? props.nodeProps.data.fontSize : "16px",
    fontFamily: props.nodeProps.data.fontFamily ?? "Arial",
  };

  const renderContent = () => {
    if (isEditing) {
      return (
        <Box className="nodrag">
          <TextField
            variant="outlined"
            defaultValue={props.nodeProps.data.text}
            onBlur={handleChangeText}
            onKeyDown={(event) => event.key === "Escape" && handleChangeText(event)}
            inputProps={{
              style: textStyle,
            }}
            multiline
            autoFocus
          />
        </Box>
      );
    }

    return (
      <Typography variant="body1" color={props.nodeProps.data.color} style={textStyle} whiteSpace="pre-wrap">
        {props.nodeProps.data.text}
      </Typography>
    );
  };

  return {
    handleClick,
    renderContent: () => props.renderContainer(renderContent()),
  };
}
