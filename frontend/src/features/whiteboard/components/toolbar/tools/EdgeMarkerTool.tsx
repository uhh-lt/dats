import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { MenuItem, Select, SelectChangeEvent, Stack, Tooltip } from "@mui/material";
import { useState } from "react";
import { EdgeMarker } from "reactflow";

const arrow2icon: Record<string, React.ReactElement> = {
  noarrow: <HorizontalRuleIcon />,
  arrow: <KeyboardArrowRightIcon />,
  arrowclosed: <PlayArrowIcon />,
};

const arrow2rotatedicon: Record<string, React.ReactElement> = {
  noarrow: <HorizontalRuleIcon style={{ transform: "rotate(180deg)" }} />,
  arrow: <KeyboardArrowRightIcon style={{ transform: "rotate(180deg)" }} />,
  arrowclosed: <PlayArrowIcon style={{ transform: "rotate(180deg)" }} />,
};

interface EdgeMarkerToolProps {
  markerStart?: EdgeMarker;
  markerEnd?: EdgeMarker;
  onMarkerStartChange: (event: SelectChangeEvent) => void;
  onMarkerEndChange: (event: SelectChangeEvent) => void;
}

export function EdgeMarkerTool({
  markerStart,
  markerEnd,
  onMarkerStartChange,
  onMarkerEndChange,
}: EdgeMarkerToolProps) {
  const [isStartSelectOpen, setIsStartSelectOpen] = useState(false);
  const [isEndSelectOpen, setIsEndSelectOpen] = useState(false);
  const [isStartTooltipOpen, setIsStartTooltipOpen] = useState(false);
  const [isEndTooltipOpen, setIsEndTooltipOpen] = useState(false);

  const handleStartSelectOpen = () => {
    setIsStartSelectOpen(true);
    setIsStartTooltipOpen(false);
  };

  const handleStartSelectClose = () => {
    setIsStartSelectOpen(false);
  };

  const handleEndSelectOpen = () => {
    setIsEndSelectOpen(true);
    setIsEndTooltipOpen(false);
  };

  const handleEndSelectClose = () => {
    setIsEndSelectOpen(false);
  };

  const handleStartTooltipOpen = () => {
    if (!isStartSelectOpen) {
      setIsStartTooltipOpen(true);
    }
  };

  const handleStartTooltipClose = () => {
    setIsStartTooltipOpen(false);
  };

  const handleEndTooltipOpen = () => {
    if (!isEndSelectOpen) {
      setIsEndTooltipOpen(true);
    }
  };

  const handleEndTooltipClose = () => {
    setIsEndTooltipOpen(false);
  };

  return (
    <Stack direction="row" alignItems="center">
      <Tooltip
        title="Edge start"
        arrow
        open={isStartTooltipOpen}
        onOpen={handleStartTooltipOpen}
        onClose={handleStartTooltipClose}
      >
        <Select
          size="small"
          sx={{
            height: "32px",
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            "& .MuiSelect-select": {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 0,
            },
          }}
          MenuProps={{
            sx: {
              "& .MuiPaper-root": {
                boxShadow: 1,
                minWidth: "0 !important",
                marginTop: "19px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              },
              "& .MuiList-root": { p: 0 },
            },
          }}
          onOpen={handleStartSelectOpen}
          onClose={handleStartSelectClose}
          value={markerStart ? markerStart.type : "noarrow"}
          onChange={onMarkerStartChange}
        >
          {["noarrow", "arrow", "arrowclosed"].map((type) => (
            <MenuItem key={type} value={type} sx={{ p: 1 }}>
              {arrow2rotatedicon[type]}
            </MenuItem>
          ))}
        </Select>
      </Tooltip>
      <Tooltip
        title="Edge end"
        arrow
        open={isEndTooltipOpen}
        onOpen={handleEndTooltipOpen}
        onClose={handleEndTooltipClose}
      >
        <Select
          size="small"
          sx={{
            height: "32px",
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            "& .MuiSelect-select": {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 0,
            },
          }}
          MenuProps={{
            sx: {
              "& .MuiPaper-root": {
                boxShadow: 1,
                minWidth: "0 !important",
                marginTop: "19px",
              },
              "& .MuiList-root": { p: 0 },
            },
          }}
          onOpen={handleEndSelectOpen}
          onClose={handleEndSelectClose}
          value={markerEnd ? markerEnd.type : "noarrow"}
          onChange={onMarkerEndChange}
        >
          {["noarrow", "arrow", "arrowclosed"].map((type) => (
            <MenuItem key={type} value={type} sx={{ minWidth: "auto", m: 0, p: 1 }}>
              {arrow2icon[type]}
            </MenuItem>
          ))}
        </Select>
      </Tooltip>
    </Stack>
  );
}
