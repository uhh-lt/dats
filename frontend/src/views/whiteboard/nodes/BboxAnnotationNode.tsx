import React from "react";
import { Position } from "reactflow";
import { Card, CardContent, CardHeader, Typography } from "@mui/material";
import "./nodes.css";
import { NodeProps } from "./MemoNode";
import BboxAnnotationHooks from "../../../api/BboxAnnotationHooks";
import SdocHooks from "../../../api/SdocHooks";
import ImageCropper2 from "./ImageCropper2";
import ExpandHandle from "./ExpandHandle";

function BboxAnnotationNode({ data, isConnectable }: NodeProps) {
  const annotation: any = BboxAnnotationHooks.useGetAnnotation(data.objId);
  const sdoc: any = SdocHooks.useGetDocumentByAdocId(annotation.data?.annotation_document_id);
  const filename = sdoc.isLoading ? "Loading" : sdoc.isError ? "Error" : sdoc.isSuccess ? sdoc.data.filename : "";

  /*
  <ImageCropper
    imageUrl={sdoc.data.content}
    topLeftX={annotation.data.x_min}
    topLeftY={annotation.data.y_min}
    bottomRightX={annotation.data.x_max}
    bottomRightY={annotation.data.y_max}
    additionalStyle={{
      border: "2px solid " + annotation.data.code.color,
      width: data.isSelected ? annotation.data.x_max - annotation.data.x_min : 135,
    }}
  />
   */

  return (
    <Card
      className="bbox-node"
      style={{
        backgroundColor: data.isSelected ? "#FDDA0D" : "#AF7C7B",
        maxWidth: data.isSelected ? 160 : 150,
        maxHeight: data.isSelected ? undefined : 130,
      }}
    >
      {data.position === Position.Bottom && (
        <ExpandHandle id={data.id} handleType="target" position={Position.Top} isConnectable={isConnectable} />
      )}
      <CardHeader
        titleTypographyProps={{ fontSize: 12, fontWeight: "bold" }}
        style={{ padding: "0 0 4px" }}
        className="node-header"
        title={"Bounding Box over " + filename}
      />
      <CardContent className="bbox-content" style={{ padding: 2 }}>
        {annotation.isSuccess && sdoc.isSuccess ? (
          <ImageCropper2
            imageUrl={sdoc.data.content}
            x={annotation.data.x_min}
            y={annotation.data.y_min}
            width={annotation.data.x_max - annotation.data.x_min}
            height={annotation.data.y_max - annotation.data.y_min}
            targetSize={{ width: data.isSelected ? 100 : 60, height: undefined }}
            style={{
              border: "2px solid " + annotation.data.code.color,
            }}
          />
        ) : annotation.isError || sdoc.isError ? (
          <Typography variant="body2">{sdoc.error.message}</Typography>
        ) : (
          <Typography variant="body2">Loading ...</Typography>
        )}
      </CardContent>
      {data.position === Position.Top && (
        <ExpandHandle id={data.id} handleType="source" position={Position.Bottom} isConnectable={isConnectable} />
      )}
    </Card>
  );
}

export default BboxAnnotationNode;
