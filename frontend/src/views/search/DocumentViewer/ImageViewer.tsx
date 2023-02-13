import { AnnotationDocumentRead, BBoxAnnotationReadResolvedCode, SourceDocumentRead } from "../../../api/openapi";
import AdocHooks from "../../../api/AdocHooks";
import React, { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { Box } from "@mui/material";
import ImageContextMenu, { ImageContextMenuHandle } from "../../../components/ContextMenu/ImageContextMenu";
import MetadataHooks from "../../../api/MetadataHooks";

interface ImageViewerProps {
  sdoc: SourceDocumentRead;
  adoc: AnnotationDocumentRead | null;
  showEntities: boolean;
  height: number;
}

const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        width: img.width,
        height: img.height,
      });
    img.onerror = (error) => reject(error);
    img.src = url;
  });
};

function ImageViewer({ sdoc, adoc, showEntities, height }: ImageViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const bboxRef = useRef<SVGGElement>(null);
  const textRef = useRef<SVGGElement>(null);
  const imgRef = useRef<SVGImageElement>(null);
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
    const createViewport = async () => {
      // select nodes & links
      const img = d3.select("image");
      const rect = d3.select(bboxRef.current).selectAll<SVGRectElement, BBoxAnnotationReadResolvedCode>("rect");
      const text = d3.select(textRef.current).selectAll<SVGTextElement, BBoxAnnotationReadResolvedCode>("text");
      const data = showEntities ? annotations.data || [] : [];
      const { width: imgWidth, height: imgHeight } = await getImageDimensions(sdoc.content);
      const scaledRatio = 500 / imgHeight;

      if (svgRef.current) {
        const portWidth: number = svgRef.current.width.baseVal.value;
        img.attr("x", portWidth / 2 - (imgWidth * scaledRatio) / 2);
      }

      // add & remove nodes
      rect
        .data(data, (datum) => datum.id)
        .join(
          (enter) =>
            enter
              .append("rect")
              .attr("x", (d) => d.x_min * scaledRatio)
              .attr("y", (d) => d.y_min * scaledRatio)
              .attr("width", (d) => (d.x_max - d.x_min) * scaledRatio)
              .attr("height", (d) => (d.y_max - d.y_min) * scaledRatio)
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
              .attr("x", (d) => d.x_min * scaledRatio + 3)
              .attr("y", (d) => d.y_max * scaledRatio - 3)
              .attr("fill", "white")
              .attr("stroke", "black")
              .attr("stroke-width", 0.75)
              .attr("font-size", `${Math.max(21, height / 17)}px`)

              .text((d) => d.code.name),

          (update) => update.attr("x", (d) => d.x_min),
          (exit) => exit.remove()
        );
    };
    createViewport().catch(console.error);
  }, [height, annotations.data, showEntities, sdoc.content]);

  return (
    <Box onContextMenu={handleContextMenu}>
      {annotations.isError && <span>{annotations.error.message}</span>}
      <svg ref={svgRef} width="100%" height={"500px"} style={{ cursor: "move" }}>
        <g ref={gRef}>
          <image href={sdoc.content} ref={imgRef} height={500} />
          <g ref={bboxRef}></g>
          <g ref={textRef}></g>
        </g>
      </svg>
      <ImageContextMenu ref={imageContextMenuRef} />
    </Box>
  );
}

export default ImageViewer;
