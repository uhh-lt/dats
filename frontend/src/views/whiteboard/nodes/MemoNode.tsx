import React, { useCallback } from "react";
import { Position } from "reactflow";
import { Card, CardContent, CardHeader, Typography } from "@mui/material";
import "./nodes.css";
import ExpandHandle from "./ExpandHandle";

interface MemoNodeProps {
  data: any;
  isConnectable: boolean;
}

function MemoNode({ data, isConnectable }: MemoNodeProps) {
  // TODO: use <input> with onChange to edit a memo
  const onChange = useCallback((evt: any) => {
    console.log(evt.target.value);
  }, []);

  return (
    <Card className="memo-node" style={{ backgroundColor: data.isSelected ? "#FDDA0D" : "lightgreen" }}>
      <ExpandHandle id={`${data.id}-top`} handleType="target" position={Position.Top} isConnectable={isConnectable} />
      <CardHeader
        titleTypographyProps={{ fontSize: 12, fontWeight: "bold" }}
        style={{ padding: "0 0 6px" }}
        className="node-header"
        title={"Memo: " + data.title}
      />
      <CardContent className="memo-content" style={{ padding: 3, maxHeight: data.isSelected ? 200 : 54 }}>
        <Typography fontSize={10} textAlign={"center"}>
          {data.content}
        </Typography>
      </CardContent>
      <ExpandHandle
        id={`${data.id}-bot`}
        handleType="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
      />
    </Card>
  );
}

export default MemoNode;
