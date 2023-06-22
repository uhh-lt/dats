import { Box, TextField, Typography, useTheme } from "@mui/material";
import { useState } from "react";
import { NodeProps, useReactFlow } from "reactflow";
import { TextNodeData } from "../types/TextNodeData";
import BaseNode from "./BaseNode";

function TextNode({ id, data, selected }: NodeProps<TextNodeData>) {
  const reactFlowInstance = useReactFlow();
  const theme = useTheme();

  const [isEditing, setIsEditing] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (event.detail >= 2) {
      setIsEditing(true);
    }
  };

  const handleChangeText = (
    event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement, Element> | React.KeyboardEvent<HTMLDivElement>
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
      })
    );
    setIsEditing(false);
  };

  return (
    <BaseNode
      allowDrawConnection={false}
      nodeId={id}
      selected={selected}
      onClick={handleClick}
      style={{ backgroundColor: data.color }}
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
        <Typography variant={data.variant} color="text.secondary" whiteSpace="pre-wrap">
          {data.text}
        </Typography>
      )}
    </BaseNode>
  );
}

export default TextNode;