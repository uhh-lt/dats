import {
  AnnotationDocumentRead,
  BBoxAnnotationReadResolvedCode,
  SourceDocumentRead,
  SpanAnnotationReadResolved,
} from "../../../api/openapi";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Button, ButtonGroup, Toolbar, Typography } from "@mui/material";
import CodeContextMenu, { CodeSelectorHandle } from "../ContextMenu/CodeContextMenu";
import { ICode } from "../TextAnnotator/ICode";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import { QueryKey } from "../../../api/QueryKey";
import BboxAnnotationHooks from "../../../api/BboxAnnotationHooks";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import SVGBBox from "./SVGBBox";
import SVGBBoxText from "./SVGBBoxText";
import AdocHooks from "../../../api/AdocHooks";

interface ImageAnnotatorProps {
  sdoc: SourceDocumentRead;
  adoc: AnnotationDocumentRead | null;
}

function ImageAnnotator({ sdoc, adoc }: ImageAnnotatorProps) {
  // references to svg elements
  const svgRef = useRef<SVGSVGElement>(null);
  const gZoomRef = useRef<SVGGElement>(null);
  const gDragRef = useRef<SVGGElement>(null);
  const rectRef = useRef<SVGRectElement>(null);
  const imgRef = useRef<SVGImageElement>(null);
  const codeSelectorRef = useRef<CodeSelectorHandle>(null);

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

  const data = useMemo(() => {
    return (annotations || []).filter((bbox) => !hiddenCodeIds.includes(bbox.code.id));
  }, [annotations, hiddenCodeIds]);

  // local client state
  const [isZooming, setIsZooming] = useState(true);
  const [selectedBbox, setSelectedBbox] = useState<BBoxAnnotationReadResolvedCode | null>(null);

  // mutations for create, update, delete
  const queryClient = useQueryClient();
  const createMutation = BboxAnnotationHooks.useCreateAnnotation({
    onSuccess: (data) => {
      SnackbarAPI.openSnackbar({
        text: `Created Bounding Box Annotation ${data.id}`,
        severity: "success",
      });
    },
    // optimistic updates
    onMutate: async (newBbox) => {
      // when we create a new bbox annotation, we add a new bbox to a certain annotation document
      // thus, we only affect the annotation document that we are adding to
      const affectedQueryKey = [QueryKey.ADOC_BBOX_ANNOTATIONS, newBbox.requestBody.annotation_document_id];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(affectedQueryKey);

      // Snapshot the previous value
      const previousBboxes = queryClient.getQueryData(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(affectedQueryKey, (old: BBoxAnnotationReadResolvedCode[] | undefined) => {
        const bbox = {
          ...newBbox.requestBody,
          id: -1,
          code: {
            name: "",
            color: "",
            description: "",
            id: newBbox.requestBody.current_code_id,
            project_id: 0,
            user_id: 0,
            created: "",
            updated: "",
          },
          created: "",
          updated: "",
        };
        return old === undefined ? [bbox] : [...old, bbox];
      });

      // Return a context object with the snapshotted value
      return { previousBboxes, myCustomQueryKey: affectedQueryKey };
    },
    onError: (error: Error, newBbox, context: any) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(context.myCustomQueryKey, context.previousBboxes);
    },
    // Always re-fetch after error or success:
    onSettled: (data, error, variables, context: any) => {
      queryClient.invalidateQueries(context.myCustomQueryKey);
    },
  });
  const updateMutation = BboxAnnotationHooks.useUpdate({
    onSuccess: (data) => {
      SnackbarAPI.openSnackbar({
        text: `Updated Bounding Box Annotation ${data.id}`,
        severity: "success",
      });
    },
    // optimistic update
    // todo: rework to only update QueryKey.BBOX_ANNOTATION (we need to change the rendering for this...)
    onMutate: async (updateData) => {
      // when we update a bbox annotation, we update a bbox of a certain annotation document
      // thus, we only affect the annotation document that contains the bbox we update
      const affectedQueryKey = [QueryKey.ADOC_BBOX_ANNOTATIONS, updateData.bboxToUpdate.annotation_document_id];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(affectedQueryKey);

      // Snapshot the previous value
      const previousBboxes = queryClient.getQueryData(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(affectedQueryKey, (old: BBoxAnnotationReadResolvedCode[] | undefined) => {
        if (!old) {
          return undefined;
        }
        const oldBboxAnnotation = old.find((anno) => anno.id === updateData.bboxToUpdate.id);
        if (!oldBboxAnnotation) {
          console.error("Could not find bbox annotation to update");
          return old;
        }
        const oldBboxAnnotationIndex = old.indexOf(oldBboxAnnotation);
        const result = Array.from(old);
        result[oldBboxAnnotationIndex] = {
          ...oldBboxAnnotation,
          code: {
            ...oldBboxAnnotation.code,
            id: updateData.requestBody.current_code_id,
          },
        };
        return result;
      });

      // Return a context object with the snapshotted value
      return { previousBboxes, myCustomQueryKey: affectedQueryKey };
    },
    onError: (error: Error, updatedBboxAnnotation, context: any) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(context.myCustomQueryKey, context.previousBboxes);
    },
    // Always re-fetch after error or success:
    onSettled: (updatedBboxAnnotation, error, variables, context: any) => {
      if (updatedBboxAnnotation) {
        queryClient.invalidateQueries([QueryKey.BBOX_ANNOTATION, updatedBboxAnnotation.id]);
      }
      queryClient.invalidateQueries(context.myCustomQueryKey);
    },
  });
  const deleteMutation = BboxAnnotationHooks.useDelete({
    onSuccess: (data) => {
      queryClient.invalidateQueries(["visibleAdocBbox"]);
      SnackbarAPI.openSnackbar({
        text: `Deleted Bounding Box Annotation ${data.id}`,
        severity: "success",
      });
    },
    // optimistic updates
    onMutate: async ({ bboxToDelete }) => {
      // when we delete a bbox annotation, we remove a bbox from a certain annotation document
      // thus, we only affect the annotation document that we are removing from
      const affectedQueryKey = [QueryKey.ADOC_BBOX_ANNOTATIONS, bboxToDelete.annotation_document_id];

      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(affectedQueryKey);

      // Snapshot the previous value
      const previousBboxes = queryClient.getQueryData(affectedQueryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(affectedQueryKey, (old: BBoxAnnotationReadResolvedCode[] | undefined) => {
        if (old === undefined) {
          return undefined;
        }

        return old.filter((bbox) => bbox.id !== bboxToDelete.id);
      });

      // Return a context object with the snapshotted value
      return { previousBboxes, myCustomQueryKey: affectedQueryKey };
    },
    onError: (error: Error, newBbox, context: any) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(context.myCustomQueryKey, context.previousBboxes);
    },
    // Always re-fetch after error or success:
    onSettled: (data, error, variables, context: any) => {
      queryClient.invalidateQueries(context.myCustomQueryKey);
    },
  });

  // right click (contextmenu) handling
  const handleRightClick = useCallback(
    (event: any, d: BBoxAnnotationReadResolvedCode) => {
      event.preventDefault();
      const rect = event.target.getBoundingClientRect();
      const position = {
        left: rect.left,
        top: rect.top + rect.height,
      };
      codeSelectorRef.current!.open(position, [d]);
      setSelectedBbox(d);
    },
    [codeSelectorRef]
  );

  // drag handling
  const drag = useMemo(() => d3.drag<SVGGElement, unknown>(), []);

  const handleDragStart = (event: d3.D3DragEvent<any, any, any>, d: any) => {
    if (!rectRef.current) return;

    const myRect = d3.select(rectRef.current);
    myRect
      .attr("xOrigin", event.x)
      .attr("yOrigin", event.y)
      .attr("x", event.x)
      .attr("width", 0)
      .attr("y", event.y)
      .attr("height", 0);
  };

  const handleDrag = (event: d3.D3DragEvent<any, any, any>, d: any) => {
    if (!rectRef.current) return;

    const myRect = d3.select(rectRef.current);
    const myImage = d3.select(imgRef.current).node()!.getBBox();

    const x = parseInt(myRect.attr("xOrigin"));
    const y = parseInt(myRect.attr("yOrigin"));
    const w = Math.abs(event.x - x);
    const h = Math.abs(event.y - y);

    if (event.x < x && event.y < y) {
      const maxWidth = x;
      const maxHeight = y;
      myRect
        .attr("y", Math.max(0, y - h))
        .attr("x", Math.max(0, x - w))
        .attr("width", Math.min(w, maxWidth))
        .attr("height", Math.min(h, maxHeight));
    } else if (event.x < x) {
      const maxWidth = x;
      const maxHeight = myImage.height - y;
      myRect
        .attr("x", Math.max(0, x - w))
        .attr("width", Math.min(w, maxWidth))
        .attr("height", Math.min(h, maxHeight));
    } else if (event.y < y) {
      const maxWidth = myImage.width - x;
      const maxHeight = y;
      myRect
        .attr("width", Math.min(w, maxWidth))
        .attr("y", Math.max(0, y - h))
        .attr("height", Math.min(h, maxHeight));
    } else {
      const maxWidth = myImage.width - x;
      const maxHeight = myImage.height - y;
      myRect.attr("width", Math.min(w, maxWidth)).attr("height", Math.min(h, maxHeight));
    }
  };

  const handleDragEnd = (event: d3.D3DragEvent<any, any, any>, d: any) => {
    const myRect = d3.select(rectRef.current);
    const width = parseInt(myRect.attr("width"));
    const height = parseInt(myRect.attr("height"));

    // only open the code selector if the rect is big enough
    if (width > 10 && height > 10) {
      const boundingBox = myRect.node()!.getBoundingClientRect();
      const position = {
        left: boundingBox.left,
        top: boundingBox.top + boundingBox.height,
      };
      codeSelectorRef.current!.open(position);
    } else {
      resetRect();
    }
  };

  const resetRect = () => {
    const myRect = d3.select(rectRef.current);
    myRect.attr("width", 0).attr("height", 0);
  };

  // zoom handling
  const zoom = useMemo(() => d3.zoom<SVGSVGElement, unknown>(), []);

  const handleZoom = useCallback((e: d3.D3ZoomEvent<any, any>) => {
    d3.select(gZoomRef.current).attr("transform", e.transform.toString());
  }, []);

  // init component, so that zoom is default
  useEffect(() => {
    if (svgRef.current) {
      const svg = d3.select<SVGSVGElement, unknown>(svgRef.current!);
      zoom.on("zoom", handleZoom);
      svg.call(zoom);
    }
  }, [zoom, svgRef, handleZoom]);

  // button handlers
  const toggleZoom = () => {
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current!);
    const gDrag = d3.select<SVGGElement, unknown>(gDragRef.current!);

    if (isZooming) {
      svg.on(".zoom", null);

      drag.on("start", handleDragStart);
      drag.on("drag", handleDrag);
      drag.on("end", handleDragEnd);
      gDrag.call(drag);
    } else {
      gDrag.on(".drag", null);

      zoom.on("zoom", handleZoom);
      svg.call(zoom);
    }
    setIsZooming(!isZooming);
  };

  const resetZoom = () => {
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current!);
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
  };

  // code selector events
  const onCodeSelectorAddCode = (code: ICode) => {
    if (adoc) {
      const myRect = d3.select(rectRef.current);
      const x = parseInt(myRect.attr("x"));
      const y = parseInt(myRect.attr("y"));
      const width = parseInt(myRect.attr("width"));
      const height = parseInt(myRect.attr("height"));
      createMutation.mutate({
        requestBody: {
          current_code_id: code.id,
          annotation_document_id: adoc.id,
          x_min: x,
          x_max: x + width,
          y_min: y,
          y_max: y + height,
        },
      });
      // console.log("Add", code);
      // console.log(`drag end: {x: ${x}, y: ${y}, width: ${width}, height: ${height}}`);
    } else {
      console.error("This should never happen! (onCodeSelectorAddCode)");
    }
  };

  const onCodeSelectorEditCode = (
    annotationToEdit: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode,
    code: ICode
  ) => {
    if (selectedBbox) {
      updateMutation.mutate({
        bboxToUpdate: selectedBbox,
        resolve: true,
        requestBody: {
          current_code_id: code.id,
          x_min: selectedBbox.x_min,
          x_max: selectedBbox.x_max,
          y_min: selectedBbox.y_min,
          y_max: selectedBbox.y_max,
        },
      });
      // console.log("Edit", code);
    } else {
      console.error("This should never happen! (onCodeSelectorEditCode)");
    }
  };

  const onCodeSelectorDeleteCode = () => {
    if (selectedBbox) {
      deleteMutation.mutate({ bboxToDelete: selectedBbox });
      // console.log("Delete", code);
    } else {
      console.error("This should never happen! (onCodeSelectorDeleteCode)");
    }
  };

  const onCodeSelectorClose = () => {
    resetRect(); // reset selection
    setSelectedBbox(null); // reset selected bounding box
  };

  return (
    <>
      <Toolbar variant="dense">
        <ButtonGroup>
          <Button onClick={() => toggleZoom()} variant={isZooming ? "contained" : "outlined"}>
            Zoom
          </Button>
          <Button onClick={() => toggleZoom()} variant={!isZooming ? "contained" : "outlined"}>
            Annotate
          </Button>
        </ButtonGroup>
        <Button onClick={() => resetZoom()} variant="outlined" sx={{ ml: 2, flexShrink: 0 }}>
          Reset Zoom
        </Button>
        <Typography variant="body1" component="div" sx={{ ml: 2 }}>
          Hint:{" "}
          {isZooming
            ? "Try to drag the image & use mouse wheel to zoom. Right click boxes to edit annotations."
            : "Drag to create annotations. Right click boxes to edit annotations."}
        </Typography>
      </Toolbar>

      <CodeContextMenu
        ref={codeSelectorRef}
        onAdd={onCodeSelectorAddCode}
        onEdit={onCodeSelectorEditCode}
        onDelete={onCodeSelectorDeleteCode}
        onClose={onCodeSelectorClose}
      />
      <svg ref={svgRef} width="100%" height="100%" style={{ cursor: isZooming ? "move" : "auto" }}>
        <g ref={gZoomRef}>
          <g ref={gDragRef} style={{ cursor: isZooming ? "move" : "crosshair" }}>
            <image ref={imgRef} href={sdoc.content} style={{ outline: "1px solid black" }} />
            <rect
              ref={rectRef}
              x={0}
              y={0}
              stroke={"black"}
              strokeWidth={3}
              fill={"transparent"}
              width={0}
              height={0}
            ></rect>
          </g>
          <g>
            {data.map((bbox) => (
              <SVGBBox key={bbox.id} bbox={bbox} onContextMenu={handleRightClick} />
            ))}
          </g>
          <g>
            {data.map((bbox) => (
              <SVGBBoxText key={bbox.id} bbox={bbox} onContextMenu={handleRightClick} />
            ))}
          </g>
        </g>
      </svg>
    </>
  );
}

export default ImageAnnotator;
