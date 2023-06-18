import React, { useCallback } from "react";
import { Position } from "reactflow";
import { Card, CardContent, CardHeader, Stack, Typography } from "@mui/material";
import "./nodes.css";
import LabelIcon from "@mui/icons-material/Label";
import CodeHooks from "../../../api/CodeHooks";
import { NodeProps } from "./MemoNode";
import ExpandHandle from "./ExpandHandle";

function CodeNode({ data, isConnectable }: NodeProps) {
  const code: any = CodeHooks.useGetCode(data.objId);
  const name = code.isLoading ? "Loading" : code.isError ? "Error" : code.isSuccess ? code.data.name : "";

  // TODO: use <input> with onChange to edit a code (name and description)
  const onChange = useCallback((evt: any) => {
    console.log(evt.target.value);
  }, []);

  return (
    <Card className="tag-node" style={{ backgroundColor: data.isSelected ? "#FDDA0D" : "#AF7C7B" }}>
      {data.position === Position.Bottom && (
        <ExpandHandle id={data.id} handleType="target" position={Position.Top} isConnectable={isConnectable} />
      )}
      <CardHeader
        titleTypographyProps={{ fontSize: 12, fontWeight: "bold" }}
        style={{ padding: "0 0 4px" }}
        className="node-header"
        title={
          <Stack direction="row" paddingRight={1}>
            <LabelIcon style={{ color: code.data?.color, blockSize: 18 }} />
            {"Code: " + name}
          </Stack>
        }
      />
      {code.isSuccess && code.data.description && (
        <CardContent className="tag-content" style={{ padding: 2, maxHeight: data.isSelected ? 120 : 50 }}>
          <Typography fontSize={10} textAlign={"center"}>
            {code.data.description}
          </Typography>
        </CardContent>
      )}
      {data.position === Position.Top && (
        <ExpandHandle id={data.id} handleType="source" position={Position.Bottom} isConnectable={isConnectable} />
      )}
    </Card>
  );
}

export default CodeNode;
