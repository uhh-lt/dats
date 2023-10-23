import { Box, TextField, Typography, useTheme } from "@mui/material";
import { useState } from "react";
import { NodeProps, useReactFlow } from "reactflow";
import { TextData } from "../types/base/TextData";
import BaseNode from "./BaseNode";

function TextNode({ id, data, selected }: NodeProps<TextData>) {
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
    // @ts-ignore
    const value: string = event.target.value;
    console.log(value);
    reactFlowInstance.setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
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
    <BaseNode
      allowDrawConnection={false}
      nodeId={id}
      selected={selected}
      onClick={handleClick}
      alignment={data.verticalAlign}
    >
      {isEditing ? (
        <Box className="nodrag">
          <TextField
            variant="outlined"
            defaultValue={data.text}
            onBlur={handleChangeText}
            onKeyDown={(event) => event.key === "Escape" && handleChangeText(event)}
            inputProps={{
              style: {
                ...theme.typography[data.variant],
              },
            }}
            multiline
            autoFocus
          />
        </Box>
      ) : (
        <Typography
          variant={data.variant}
          color={data.color}
          style={{
            ...(data.italic && { fontStyle: "italic" }),
            ...(data.bold && { fontWeight: "bold" }),
            ...(data.underline && { textDecoration: "underline" }),
            textAlign: data.horizontalAlign,
            width: "100%",
          }}
          whiteSpace="pre-wrap"
        >
          {data.text}
        </Typography>
      )}
    </BaseNode>
  );
}

export default TextNode;
