import { Box, TextField, Typography, useTheme } from "@mui/material";
import { useState } from "react";
import { NodeProps, useReactFlow } from "reactflow";
import { TextData } from "../types/base/TextData.ts";
import BaseNode from "./BaseNode.tsx";

function TextNode(props: NodeProps<TextData>) {
  const reactFlowInstance = useReactFlow();
  const theme = useTheme();

  const [isEditing, setIsEditing] = useState(false);

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

  return (
    <BaseNode allowDrawConnection={false} nodeProps={props} onClick={handleClick} alignment={props.data.verticalAlign}>
      {isEditing ? (
        <Box className="nodrag">
          <TextField
            variant="outlined"
            defaultValue={props.data.text}
            onBlur={handleChangeText}
            onKeyDown={(event) => event.key === "Escape" && handleChangeText(event)}
            inputProps={{
              style: {
                ...theme.typography[props.data.variant],
              },
            }}
            multiline
            autoFocus
          />
        </Box>
      ) : (
        <Typography
          variant={props.data.variant}
          color={props.data.color}
          style={{
            ...(props.data.italic && { fontStyle: "italic" }),
            ...(props.data.bold && { fontWeight: "bold" }),
            ...(props.data.underline && { textDecoration: "underline" }),
            textAlign: props.data.horizontalAlign,
            width: "100%",
          }}
          whiteSpace="pre-wrap"
        >
          {props.data.text}
        </Typography>
      )}
    </BaseNode>
  );
}

export default TextNode;
