import { Box, Typography } from "@mui/material";
import { ReactElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// the room kept for "+N more" when not all chips fit
const MORE_WIDTH = 64;
// chips keep their natural width (an Autocomplete limits them relative to their parent, which is this item)
const ITEM_SX = { display: "inline-flex", "& > .MuiChip-root": { maxWidth: "none" } };

interface OneRowChipsProps {
  // the chips, e.g. the selected values of an Autocomplete
  children: ReactElement[];
}

/**
 * Shows chips in exactly one row: as many as fit the width, then "+N more". It fills the space left by its siblings,
 * e.g. as the tags of an Autocomplete (see oneRowChipsAutocompleteSx).
 */
export function OneRowChips({ children }: OneRowChipsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [numVisible, setNumVisible] = useState(children.length);

  // hidden chips stay rendered (invisible, out of the flow), so all chips can be measured
  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const available = container.clientWidth;
    const widths = itemRefs.current.slice(0, children.length).map((item) => item?.offsetWidth ?? 0);
    if (widths.reduce((sum, width) => sum + width, 0) <= available) {
      setNumVisible(widths.length);
      return;
    }
    let used = 0;
    let fit = 0;
    for (const width of widths) {
      if (used + width + MORE_WIDTH > available) break;
      used += width;
      fit += 1;
    }
    setNumVisible(Math.max(fit, 1));
  }, [children.length]);

  // measure after every render (the chips may change) and whenever the width changes
  useLayoutEffect(measure);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure]);

  const numHidden = children.length - numVisible;
  return (
    <Box
      ref={containerRef}
      sx={{
        display: "flex",
        alignItems: "center",
        flex: "1 1 0",
        minWidth: 0,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {children.map((chip, index) => (
        <Box
          component="span"
          key={chip.key ?? index}
          ref={(element: HTMLSpanElement | null) => {
            itemRefs.current[index] = element;
          }}
          sx={
            index < numVisible
              ? { ...ITEM_SX, flexShrink: 0 }
              : { ...ITEM_SX, position: "absolute", visibility: "hidden", pointerEvents: "none" }
          }
        >
          {chip}
        </Box>
      ))}
      {numHidden > 0 && (
        <Typography variant="body2" color="text.secondary" noWrap sx={{ flexShrink: 0, px: 0.5 }}>
          +{numHidden} more
        </Typography>
      )}
    </Box>
  );
}
