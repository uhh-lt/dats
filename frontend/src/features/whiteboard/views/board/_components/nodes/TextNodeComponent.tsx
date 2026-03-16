import { Box, TextField, Typography } from "@mui/material";
import { NodeProps, useReactFlow } from "@xyflow/react";
import { useState } from "react";
import { DATSEdge } from "../../_types/DATSEdge";
import { DATSCustomNode } from "../../_types/DATSNode";
import { isBorderNode, isNoteNode, isTextNode } from "../../_types/typeGuards";

export interface TextNodeComponentProps<T extends DATSCustomNode> {
  nodeProps: NodeProps<T>;
}

export function TextNodeComponent<T extends DATSCustomNode>({ nodeProps }: TextNodeComponentProps<T>) {
  // Edit Mode
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftText, setDraftText] = useState<string>(nodeProps.data.text);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (event.detail >= 2) {
      setDraftText(nodeProps.data.text);
      setIsEditing(true);
    }
  };

  // Handle Text Change
  const reactFlowInstance = useReactFlow<DATSCustomNode, DATSEdge>();
  const commitText = (value: string) => {
    reactFlowInstance.setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeProps.id) {
          if (isTextNode(node)) {
            return {
              ...node,
              data: {
                ...node.data,
                text: value,
              },
            };
          }

          if (isNoteNode(node)) {
            return {
              ...node,
              data: {
                ...node.data,
                text: value,
              },
            };
          }

          if (isBorderNode(node)) {
            return {
              ...node,
              data: {
                ...node.data,
                text: value,
              },
            };
          }

          return node;
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
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            onBlur={() => commitText(draftText)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                commitText(draftText);
              }
            }}
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
