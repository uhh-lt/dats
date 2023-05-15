import React from "react";
import { Handle, Position } from "reactflow";
import { Card, CardContent, CardHeader, CardMedia, Link, Typography } from "@mui/material";
import "./nodes.css";
import SdocHooks from "../../../api/SdocHooks";
import { DocType, SourceDocumentRead } from "../../../api/openapi";
import { toThumbnailUrl } from "../../search/utils";

interface SdocNodeProps {
  data: any;
  isConnectable: boolean;
}

function SdocNode({ data, isConnectable }: SdocNodeProps) {
  const sdoc: any = SdocHooks.useGetDocument(data.objId);
  const docType = sdoc.data?.doctype;
  const title = sdoc.isLoading ? "Loading" : sdoc.isError ? "Error" : sdoc.isSuccess ? sdoc.data.filename : "";

  // TODO: make the title <Link to={...}> to the page of the document
  // TODO: double click on the node could open the respective document in a new tab

  return (
    <Card className="sdoc-node" style={{ backgroundColor: data.isSelected ? "#FDDA0D" : "#AF7C7B" }}>
      {data.position === Position.Bottom && (
        <Handle id={data.id} type="target" position={Position.Top} isConnectable={isConnectable} />
      )}
      <CardHeader
        titleTypographyProps={{ fontSize: 8, fontWeight: "bold" }}
        style={{ padding: "0 0 4px" }}
        className="node-header"
        title={
          <>
            <>{"Document: "}</>
            <>
              {sdoc.isSuccess ? (
                <Link href={`search/doc/${sdoc.data.id}`} target="_blank">
                  {title}
                </Link>
              ) : (
                <>title</>
              )}
            </>
          </>
        }
      />
      <CardContent
        className="sdoc-content"
        style={{ padding: 2, maxHeight: !data.isSelected || docType === DocType.IMAGE ? 68 : 120 }}
      >
        {sdoc.isSuccess ? (
          <>
            {docType === DocType.IMAGE ? (
              <CardMedia component="img" height={60} image={toThumbnailUrl(sdoc.data.content)} alt="Paella dish" />
            ) : docType === DocType.TEXT ? (
              <TextPreview sdoc={sdoc.data} />
            ) : (
              <Typography fontSize={8} textAlign={"center"}>
                DOC TYPE IS NOT SUPPORTED
              </Typography>
            )}
          </>
        ) : sdoc.isError ? (
          <Typography variant="body2">{sdoc.error.message}</Typography>
        ) : (
          <Typography variant="body2">Loading ...</Typography>
        )}
      </CardContent>
      {data.position === Position.Top && (
        <Handle id={data.id} type="source" position={Position.Bottom} isConnectable={isConnectable} />
      )}
    </Card>
  );
}

function TextPreview({ sdoc }: { sdoc: SourceDocumentRead }) {
  // global server state (react-query)
  const content = SdocHooks.useGetDocumentContent(sdoc.id);

  // rendering
  if (content.isSuccess) {
    return (
      <Typography height={54} fontSize={6} textAlign={"center"}>
        {content.data.content}
      </Typography>
    );
  }

  if (content.isError) {
    return (
      <Typography height={54} fontSize={8} textAlign={"center"}>
        {content.error.message}
      </Typography>
    );
  }

  return (
    <Typography height={54} fontSize={8} textAlign={"center"}>
      Loading ...
    </Typography>
  );
}

export default SdocNode;
