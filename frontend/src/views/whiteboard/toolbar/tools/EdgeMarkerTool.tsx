import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { MenuItem, Select, SelectChangeEvent, Tooltip } from "@mui/material";
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
  onStartSelectOpen: () => void;
  onStartSelectClose: () => void;
  onEndSelectOpen: () => void;
  onEndSelectClose: () => void;
  isStartTooltipOpen: boolean;
  isEndTooltipOpen: boolean;
  onStartTooltipOpen: () => void;
  onStartTooltipClose: () => void;
  onEndTooltipOpen: () => void;
  onEndTooltipClose: () => void;
}

export default function EdgeMarkerTool({
  markerStart,
  markerEnd,
  onMarkerStartChange,
  onMarkerEndChange,
  onStartSelectOpen,
  onStartSelectClose,
  onEndSelectOpen,
  onEndSelectClose,
  isStartTooltipOpen,
  isEndTooltipOpen,
  onStartTooltipOpen,
  onStartTooltipClose,
  onEndTooltipOpen,
  onEndTooltipClose,
}: EdgeMarkerToolProps) {
  return (
    <>
      <Tooltip
        title="Line start"
        arrow
        open={isStartTooltipOpen}
        onOpen={onStartTooltipOpen}
        onClose={onStartTooltipClose}
      >
        <Select
          size="small"
          sx={{
            mr: 0.5,
            height: "32px",
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            "& .MuiSelect-select": {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 0.5,
            },
          }}
          MenuProps={{
            sx: {
              "& .MuiPaper-root": {
                boxShadow: 1,
                marginTop: "17px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              },
            },
          }}
          onOpen={onStartSelectOpen}
          onClose={onStartSelectClose}
          value={markerStart ? markerStart.type : "noarrow"}
          onChange={onMarkerStartChange}
        >
          {["noarrow", "arrow", "arrowclosed"].map((type) => (
            <MenuItem key={type} value={type} sx={{ minWidth: "auto", m: 0, p: 1 }}>
              {arrow2rotatedicon[type]}
            </MenuItem>
          ))}
        </Select>
      </Tooltip>
      <Tooltip title="Line end" arrow open={isEndTooltipOpen} onOpen={onEndTooltipOpen} onClose={onEndTooltipClose}>
        <Select
          size="small"
          sx={{
            mr: 1,
            height: "32px",
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            "& .MuiSelect-select": {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 0.5,
            },
          }}
          MenuProps={{
            sx: {
              "& .MuiPaper-root": {
                boxShadow: 1,
                marginTop: "17px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              },
            },
          }}
          onOpen={onEndSelectOpen}
          onClose={onEndSelectClose}
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
    </>
  );
}
