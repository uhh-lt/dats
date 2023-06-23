import React, { useCallback } from "react";
import { Position } from "reactflow";
import { Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import "./nodes.css";
import TagHooks from "../../../api/TagHooks";
import LabelIcon from "@mui/icons-material/Label";
import { NodeProps } from "./MemoNode";
import ExpandHandle from "./ExpandHandle";

function TagNode({ data, isConnectable }: NodeProps) {
  const tag: any = TagHooks.useGetTag(data.objId);
  const title = tag.isLoading ? "Loading" : tag.isError ? "Error" : tag.isSuccess ? tag.data.title : "";
  const hasDescription = tag.isSuccess && tag.data.description;

  // TODO: use <input> with onChange to edit a tag (name and description)
  const onChange = useCallback((evt: any) => {
    console.log(evt.target.value);
  }, []);

  return (
    <Card className="tag-node" style={{ backgroundColor: data.isSelected ? "#FDDA0D" : "#AF7C7B" }}>
      <ExpandHandle id={data.id} handleType="target" position={Position.Top} isConnectable={isConnectable} />
      <CardHeader
        titleTypographyProps={{ fontSize: 12, fontWeight: "bold" }}
        style={{ padding: hasDescription ? "0 0 4px" : 1 }}
        className="node-header"
        title={
          <Stack direction="row" paddingRight={1}>
            <LabelIcon style={{ color: tag.data?.color, blockSize: 18 }} />
            {"Tag: " + title}
          </Stack>
        }
      />
      {hasDescription && (
        <CardContent className="tag-content" style={{ padding: 2, maxHeight: data.isSelected ? 120 : 50 }}>
          <Typography fontSize={10} textAlign={"center"}>
            {tag.data.description}
          </Typography>
        </CardContent>
      )}
      <ExpandHandle id={data.id} handleType="source" position={Position.Bottom} isConnectable={isConnectable} />
    </Card>
  );
}

export default TagNode;
