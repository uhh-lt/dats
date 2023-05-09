import React, { useCallback, useState } from "react";
import { Handle, Position } from "reactflow";
import { Card, CardContent, CardHeader, Typography } from "@mui/material";
import "./nodes.css";

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
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <CardHeader
        titleTypographyProps={{ fontSize: 12, fontWeight: "bold" }}
        style={{ padding: "0 0 6px" }}
        className="memo-header"
        title={"Memo: " + data.title}
      />
      <CardContent className="memo-content" style={{ padding: 3, maxHeight: data.isSelected ? 200 : 54 }}>
        <Typography fontSize={10} textAlign={"center"}>
          {data.content}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default MemoNode;
