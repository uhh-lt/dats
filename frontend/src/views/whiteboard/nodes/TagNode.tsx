import React, { useCallback } from "react";
import { Handle, Position } from "reactflow";
import { Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import "./nodes.css";
import TagHooks from "../../../api/TagHooks";
import LabelIcon from "@mui/icons-material/Label";

interface TagNodeProps {
  data: any;
  isConnectable: boolean;
}

function TagNode({ data, isConnectable }: TagNodeProps) {
  const tag: any = TagHooks.useGetTag(data.objId);
  const title = tag.isLoading ? "Loading" : tag.isError ? "Error" : tag.isSuccess ? tag.data.title : "";

  // TODO: use <input> with onChange to edit a tag
  const onChange = useCallback((evt: any) => {
    console.log(evt.target.value);
  }, []);

  return (
    <Card className="tag-node" style={{ backgroundColor: data.isSelected ? "#FDDA0D" : "#AF7C7B" }}>
      {data.position === Position.Bottom && (
        <Handle id={data.id} type="target" position={Position.Top} isConnectable={isConnectable} />
      )}
      <CardHeader
        titleTypographyProps={{ fontSize: 12, fontWeight: "bold" }}
        style={{ padding: "0 0 4px" }}
        className="node-header"
        title={
          <Stack direction="row" paddingRight={1}>
            <LabelIcon style={{ color: tag.data?.color, blockSize: 18 }} />
            {"Tag: " + title}
          </Stack>
        }
      />
      {tag.isSuccess && tag.data.description && (
        <CardContent className="tag-content" style={{ padding: 2, maxHeight: data.isSelected ? 120 : 50 }}>
          <Typography fontSize={10} textAlign={"center"}>
            {tag.data.description}
          </Typography>
        </CardContent>
      )}
      {data.position === Position.Top && (
        <Handle id={data.id} type="source" position={Position.Bottom} isConnectable={isConnectable} />
      )}
    </Card>
  );
}

export default TagNode;
