import SearchIcon from "@mui/icons-material/Search";
import { Box, Button } from "@mui/material";
import * as d3 from "d3";
import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SdocHooks from "../../../api/SdocHooks.ts";
import { BBoxAnnotationReadResolved } from "../../../api/openapi/models/BBoxAnnotationReadResolved.ts";
import { SourceDocumentWithDataRead } from "../../../api/openapi/models/SourceDocumentWithDataRead.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { ImageSearchActions } from "../../search/ImageSearch/imageSearchSlice.ts";

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

  const imgContainerHeight = 500;

  // global client state (redux)
  const visibleUserIds = useAppSelector((state) => state.annotations.visibleUserIds);
  const hiddenCodeIds = useAppSelector((state) => state.annotations.hiddenCodeIds);

  // global server state (react query)
  const annotations = SdocHooks.useGetBBoxAnnotationsBatch(sdoc.id, visibleUserIds);

  const annotationData = useMemo(() => {
    return (annotations.data || []).filter((bbox) => !hiddenCodeIds.includes(bbox.code.id));
  }, [annotations.data, hiddenCodeIds]);

  // ui events
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
    const rect = d3.select(bboxRef.current).selectAll<SVGRectElement, BBoxAnnotationReadResolved>("rect");
    const text = d3.select(textRef.current).selectAll<SVGTextElement, BBoxAnnotationReadResolved>("text");
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

  // find similar images
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const handleImageSimilaritySearch = () => {
    dispatch(ImageSearchActions.onChangeSearchQuery(sdoc.id));
    navigate("../imagesearch");
  };

  return (
    <Box>
      <Button variant="outlined" onClick={handleImageSimilaritySearch} startIcon={<SearchIcon />} sx={{ mb: 2 }}>
        Find similar images
      </Button>
      <svg ref={svgRef} width="100%" height={imgContainerHeight + "px"} style={{ cursor: "move" }}>
        <g ref={gRef}>
          <image ref={imgRef} href={sdoc.content} height={imgContainerHeight} />
          <g ref={bboxRef}></g>
          <g ref={textRef}></g>
        </g>
      </svg>
    </Box>
  );
}

export default ImageViewer;
