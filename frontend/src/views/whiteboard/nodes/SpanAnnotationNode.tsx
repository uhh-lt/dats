import React from "react";
import { Position } from "reactflow";
import { Card, CardHeader } from "@mui/material";
import "./nodes.css";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks";
import { NodeProps } from "./MemoNode";
import ExpandHandle from "./ExpandHandle";

function SpanAnnotationNode({ data, isConnectable }: NodeProps) {
  const annotation: any = SpanAnnotationHooks.useGetAnnotation(data.objId);
  const content = annotation.isLoading
    ? "Loading"
    : annotation.isError
    ? "Error"
    : annotation.isSuccess
    ? annotation.data.span_text
    : "";

  return (
    <Card className="span-node" style={{ backgroundColor: data.isSelected ? "#FDDA0D" : "#AF7C7B" }}>
      {data.position === Position.Bottom && (
        <ExpandHandle id={data.id} handleType="target" position={Position.Top} isConnectable={isConnectable} />
      )}
      <CardHeader
        titleTypographyProps={{ fontSize: 12, fontWeight: "bold" }}
        style={{ padding: 1 }}
        className="node-header"
        title={
          <>
            <>{"Span: "}</>
            <>
              {annotation.isSuccess ? (
                <span
                  style={{ backgroundColor: annotation.data?.code.color || undefined, paddingLeft: 2, paddingRight: 2 }}
                >
                  {content}
                </span>
              ) : (
                <>annotation</>
              )}
            </>
          </>
        }
      />
      {data.position === Position.Top && (
        <ExpandHandle id={data.id} handleType="source" position={Position.Bottom} isConnectable={isConnectable} />
      )}
    </Card>
  );
}

export default SpanAnnotationNode;
