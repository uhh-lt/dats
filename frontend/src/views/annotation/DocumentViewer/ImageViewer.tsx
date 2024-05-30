import { Box } from "@mui/material";
import * as d3 from "d3";
import React, { useEffect, useMemo, useRef } from "react";
import AdocHooks from "../../../api/AdocHooks.ts";
import SdocHooks from "../../../api/SdocHooks.ts";
import { BBoxAnnotationReadResolvedCode } from "../../../api/openapi/models/BBoxAnnotationReadResolvedCode.ts";
import { SourceDocumentWithDataRead } from "../../../api/openapi/models/SourceDocumentWithDataRead.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import ImageContextMenu, { ImageContextMenuHandle } from "./ImageContextMenu.tsx";

interface ImageViewerProps {
  sdoc: SourceDocumentWithDataRead;
}

function ImageViewer(props: ImageViewerProps) {
  const heightMetadata = SdocHooks.useGetMetadataByKey(props.sdoc.id, "height");
  const widthMetadata = SdocHooks.useGetMetadataByKey(props.sdoc.id, "width");

  if (heightMetadata.isSuccess && widthMetadata.isSuccess) {
    return (
      <ImageViewerWithData {...props} height={heightMetadata.data.int_value!} width={widthMetadata.data.int_value!} />
    );
  } else if (heightMetadata.isError) {
    return <div>{heightMetadata.error.message}</div>;
  } else if (widthMetadata.isError) {
    return <div>{widthMetadata.error.message}</div>;
  } else if (heightMetadata.isLoading || widthMetadata.isLoading) {
    return <div>Loading...</div>;
  } else {
    return <>Something went wrong!</>;
  }
}

function ImageViewerWithData({ sdoc, height, width }: ImageViewerProps & { height: number; width: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const bboxRef = useRef<SVGGElement>(null);
  const textRef = useRef<SVGGElement>(null);
  const imgRef = useRef<SVGImageElement>(null);
  const imageContextMenuRef = useRef<ImageContextMenuHandle>(null);

  const imgContainerHeight = 500;

  // global client state (redux)
  const visibleAdocIds = useAppSelector((state) => state.annotations.visibleAdocIds);
  const hiddenCodeIds = useAppSelector((state) => state.annotations.hiddenCodeIds);

  // global server state (react query)
  const annotationsBatch = AdocHooks.useGetAllBboxAnnotationsBatch(visibleAdocIds);

  // computed
  const annotations = useMemo(() => {
    const annotationsIsUndefined = annotationsBatch.some((a) => !a.data);
    if (annotationsIsUndefined) return undefined;
    return annotationsBatch.map((a) => a.data!).flat();
  }, [annotationsBatch]);

  const annotationData = useMemo(() => {
    return (annotations || []).filter((bbox) => !hiddenCodeIds.includes(bbox.code.id));
  }, [annotations, hiddenCodeIds]);

  // ui events
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();

    // calculate position of the context menu
    const position = {
      left: event.clientX,
      top: event.clientY,
    };

    imageContextMenuRef.current?.open(position, sdoc.id);
  };

  const handleZoom = (e: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
    d3.select(gRef.current).attr("transform", e.transform.toString());
  };

  const zoom = useMemo(() => d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.5, 5]).on("zoom", handleZoom), []);

  // init zoom
  useEffect(() => {
    d3.select<SVGSVGElement, unknown>(svgRef.current!).call(zoom);
    d3.select(bboxRef.current);
  }, [zoom]);

  useEffect(() => {
    const rect = d3.select(bboxRef.current).selectAll<SVGRectElement, BBoxAnnotationReadResolvedCode>("rect");
    const text = d3.select(textRef.current).selectAll<SVGTextElement, BBoxAnnotationReadResolvedCode>("text");
    const scaledRatio = imgContainerHeight / height;

    const portWidth: number = svgRef.current!.clientWidth;
    const xCentering = portWidth / 2 - (width * scaledRatio) / 2;
    imgRef.current!.setAttribute("x", "" + xCentering);

    // add & remove nodes
    rect
      .data(annotationData, (datum) => datum.id)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("x", (d) => scaledRatio * d.x_min + xCentering)
            .attr("y", (d) => scaledRatio * d.y_min)
            .attr("width", (d) => scaledRatio * (d.x_max - d.x_min))
            .attr("height", (d) => scaledRatio * (d.y_max - d.y_min))
            .attr("fill", "transparent")
            .attr("stroke", (d) => d.code.color)
            .attr("stroke-width", 3),

        (update) => update.attr("x", (d) => scaledRatio * d.x_min + xCentering),
        (exit) => exit.remove(),
      );

    // add & remove text
    text
      .data(annotationData, (datum) => datum.id)
      .join(
        (enter) =>
          enter
            .append("text")
            .attr("x", (d) => scaledRatio * (d.x_min + 3) + xCentering)
            .attr("y", (d) => scaledRatio * (d.y_max - 3))
            .attr("width", (d) => scaledRatio * (d.x_max - d.x_min))
            .attr("height", (d) => scaledRatio * (d.y_max - d.y_min))
            .attr("fill", "white")
            .attr("stroke", "black")
            .attr("stroke-width", 0.75)
            .attr("font-size", `${Math.max(21, height / 17)}px`)

            .text((d) => d.code.name),

        (update) => update.attr("x", (d) => scaledRatio * (d.x_min + 3) + xCentering),
        (exit) => exit.remove(),
      );
  }, [width, height, annotationData, sdoc.content]);

  return (
    <Box onContextMenu={handleContextMenu}>
      <svg ref={svgRef} width="100%" height={imgContainerHeight + "px"} style={{ cursor: "move" }}>
        <g ref={gRef}>
          <image ref={imgRef} href={sdoc.content} height={imgContainerHeight} />
          <g ref={bboxRef}></g>
          <g ref={textRef}></g>
        </g>
      </svg>
      <ImageContextMenu ref={imageContextMenuRef} />
    </Box>
  );
}

export default ImageViewer;
