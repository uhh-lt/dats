import { Square } from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
import { Box, CircularProgress, Divider, Stack, TextField, ToggleButton } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";
import AdocHooks from "../../../api/AdocHooks.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { useDebounce } from "../../../utils/useDebounce.ts";
import SpanAnnotationCard from "./SpanAnnotationCard.tsx";

function SpanAnnotationExplorer() {
  // data
  const visibleAdocIds = useAppSelector((state) => state.annotations.visibleAdocIds);
  const annotationsBatch = AdocHooks.useGetAllSpanAnnotationsBatch(visibleAdocIds);
  const annotations = useMemo(() => {
    const annotationsIsUndefined = annotationsBatch.some((a) => !a.data);
    if (annotationsIsUndefined) return undefined;
    return annotationsBatch.map((a) => a.data!).flat();
  }, [annotationsBatch]);
  const codes = useMemo(
    () =>
      annotations?.reduce(
        (acc, annotation) => {
          acc[annotation.code.id] = annotation.code;
          return acc;
        },
        {} as Record<number, CodeRead>,
      ) || {},
    [annotations],
  );

  // text filtering
  const [filterValue, setFilterValue] = useState("");
  const filter = useDebounce(filterValue, 300);

  // code filtering
  const [filterCodeIds, setFilterCodeIds] = useState<number[]>([]);
  const toggleFilterCodeId = (codeId: number) => {
    if (filterCodeIds.includes(codeId)) {
      setFilterCodeIds(filterCodeIds.filter((id) => id !== codeId));
    } else {
      setFilterCodeIds([...filterCodeIds, codeId]);
    }
  };

  // filtering
  const filteredAnnotations = useMemo(() => {
    const filteredAnnotations = annotations?.filter((annotation) => annotation.span_text.includes(filter)) || [];
    if (filterCodeIds.length > 0) {
      return filteredAnnotations.filter((annotation) => filterCodeIds.includes(annotation.code.id));
    }
    return filteredAnnotations;
  }, [annotations, filter, filterCodeIds]);

  // annotation selection
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<number | undefined>(undefined);
  const toggleSelectedAnnotationId = (annotationId: number) => {
    if (selectedAnnotationId === annotationId) {
      setSelectedAnnotationId(undefined);
    } else {
      setSelectedAnnotationId(annotationId);
    }
  };

  // virtualization
  const listRef: React.MutableRefObject<HTMLDivElement | null> = useRef(null);
  const virtualizer = useVirtualizer({
    count: filteredAnnotations.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 95,
  });

  return (
    <Box className="myFlexContainer h100">
      <Stack direction="row" alignItems="center" spacing={2} pl={2} pr={1}>
        <SearchIcon sx={{ color: "dimgray" }} />
        <TextField
          sx={{ "& fieldset": { border: "none" }, input: { color: "dimgray", paddingY: "12px" } }}
          fullWidth
          placeholder="Search..."
          variant="outlined"
          value={filterValue}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterValue(event.target.value);
          }}
        />
      </Stack>
      <Divider />
      <Box className="myFlexFillAllContainer" ref={listRef} p={1}>
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {annotations ? (
            <>
              {annotations.length > 0
                ? filteredAnnotations.length > 0
                  ? virtualizer.getVirtualItems().map((virtualItem) => {
                      const annotation = filteredAnnotations[virtualItem.index];
                      const isSelected = selectedAnnotationId === annotation.id;
                      return (
                        <div
                          key={virtualItem.key}
                          ref={virtualizer.measureElement}
                          data-index={virtualItem.index}
                          style={{
                            width: "100%",
                            position: "absolute",
                            top: 0,
                            left: 0,
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                        >
                          <SpanAnnotationCard
                            variant={isSelected ? "elevation" : "outlined"}
                            elevation={8}
                            key={annotation.id}
                            annotation={annotation}
                            onClick={() => toggleSelectedAnnotationId(annotation.id)}
                            sx={{ mb: 1 }}
                          />
                        </div>
                      );
                    })
                  : "No annotations found."
                : "Create an annotation to see it in the sidebar."}
            </>
          ) : (
            <CircularProgress />
          )}
        </div>
      </Box>
      <Divider />
      <Box alignItems="center" p={1}>
        {Object.values(codes).map((code) => {
          const isSelected = filterCodeIds.includes(code.id);
          return (
            <ToggleButton
              color="primary"
              key={code.id}
              value={code.id}
              selected={isSelected}
              onChange={() => {
                toggleFilterCodeId(code.id);
              }}
              sx={{ p: 0, m: 0.5 }}
            >
              <Square style={{ color: code.color }} fontSize={isSelected ? "medium" : "small"} />
            </ToggleButton>
          );
        })}
      </Box>
    </Box>
  );
}

export default SpanAnnotationExplorer;
