import { Box } from "@mui/material";
import ReactPlayer from 'react-player'
import React from "react";
import { SourceDocumentRead, AnnotationDocumentRead } from "../../../api/openapi";

interface AudioViewerProps {
  sdoc: SourceDocumentRead;
  adoc: AnnotationDocumentRead | null;
  showEntities: boolean;
  width?: number;
  height?: number;
}

function AudioViewer({ sdoc, width, height }: AudioViewerProps) {

  // ui events
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();

    // calculate position of the context menu
    const position = {
      left: event.clientX,
      top: event.clientY,
    };

    // TODO: add context menu
    console.log(position);
  };

  return (
    <Box onContextMenu={handleContextMenu} sx={{ display: "flex", justifyContent: "center", alignItems: "center", }}>
      <ReactPlayer url={sdoc.content} controls={true} width={width ?? 640} height={height ?? 360} />
    </Box>
  );
}

export default AudioViewer;
