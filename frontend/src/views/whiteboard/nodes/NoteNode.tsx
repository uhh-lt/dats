import { Box, TextField, Typography, useTheme } from "@mui/material";
import { useState } from "react";
import { NodeProps, useReactFlow } from "reactflow";
import { NoteNodeData } from "../types/customnodes/NoteNodeData";
import BaseCardNode from "./BaseCardNode";

function NoteNode(props: NodeProps<NoteNodeData>) {
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
    </BaseCardNode>
  );
}

export default NoteNode;
