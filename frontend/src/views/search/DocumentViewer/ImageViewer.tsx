import { AnnotationDocumentRead, BBoxAnnotationReadResolvedCode, SourceDocumentRead } from "../../../api/openapi";
import AdocHooks from "../../../api/AdocHooks";
import React, { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { Box } from "@mui/material";
import ImageContextMenu, { ImageContextMenuHandle } from "../../../components/ContextMenu/ImageContextMenu";

interface ImageViewerProps {
  sdoc: SourceDocumentRead;
  adoc: AnnotationDocumentRead | null;
  showEntities: boolean;
  height: number;
}

function ImageViewer({ sdoc, adoc, showEntities, height }: ImageViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const bboxRef = useRef<SVGGElement>(null);
  const textRef = useRef<SVGGElement>(null);
  const imageContextMenuRef = useRef<ImageContextMenuHandle>(null);

  // global server state (react-query)
  const annotations = AdocHooks.useGetAllBboxAnnotations(adoc?.id);

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

  const handleZoom = (e: d3.D3ZoomEvent<any, any>) => {
    d3.select(gRef.current).attr("transform", e.transform.toString());
  };

  const zoom = useMemo(() => d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.5, 5]).on("zoom", handleZoom), []);

  // init zoom
  useEffect(() => {
    d3.select<SVGSVGElement, unknown>(svgRef.current!).call(zoom);
    d3.select(bboxRef.current);
  }, [zoom]);

  useEffect(() => {
    // select nodes & links
    const rect = d3.select(bboxRef.current).selectAll<SVGRectElement, BBoxAnnotationReadResolvedCode>("rect");
    const text = d3.select(textRef.current).selectAll<SVGTextElement, BBoxAnnotationReadResolvedCode>("text");
    const data = showEntities ? annotations.data || [] : [];

    // add & remove nodes
    rect
      .data(data, (datum) => datum.id)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("x", (d) => d.x_min)
            .attr("y", (d) => d.y_min)
            .attr("width", (d) => d.x_max - d.x_min)
            .attr("height", (d) => d.y_max - d.y_min)
            .attr("fill", "transparent")
            .attr("stroke", (d) => d.code.color)
            .attr("stroke-width", 3),

        (update) => update.attr("x", (d) => d.x_min),
        (exit) => exit.remove()
      );

    // add click listener
    rect.on("click", (event, d) => {
      console.log(d);
    });

    // add & remove text
    text
      .data(data, (datum) => datum.id)
      .join(
        (enter) =>
          enter
            .append("text")
            .attr("x", (d) => d.x_min + 3)
            .attr("y", (d) => d.y_max - 3)
            .attr("fill", "white")
            .attr("stroke", "black")
            .attr("stroke-width", 0.75)
            .attr("font-size", `${Math.max(21, height / 17)}px`)

            .text((d) => d.code.name),

        (update) => update.attr("x", (d) => d.x_min),
        (exit) => exit.remove()
      );
  }, [height, annotations.data, showEntities]);

  return (
    <Box onContextMenu={handleContextMenu}>
      {annotations.isError && <span>{annotations.error.message}</span>}
      <svg ref={svgRef} width="100%" height={`${height}px`} style={{ cursor: "move" }}>
        <g ref={gRef}>
          <image href={sdoc.content} />
          <g ref={bboxRef}></g>
          <g ref={textRef}></g>
        </g>
      </svg>
      <ImageContextMenu ref={imageContextMenuRef} />
    </Box>
  );
}

export default ImageViewer;