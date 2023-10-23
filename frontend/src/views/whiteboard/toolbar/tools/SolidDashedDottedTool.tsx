import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import RemoveIcon from "@mui/icons-material/Remove";
import { Button, ButtonGroup } from "@mui/material";

interface SolidDashedDottedToolProps {
  value: "solid" | "dashed" | "dotted";
  onValueChange: (value: "solid" | "dashed" | "dotted") => void;
}

function SolidDashedDottedTool({ value, onValueChange }: SolidDashedDottedToolProps) {
  return (
    <ButtonGroup size="small" className="nodrag" sx={{ mr: 1, bgcolor: "background.paper" }}>
      <Button variant={value === "solid" ? "contained" : "outlined"} onClick={() => onValueChange("solid")}>
        <RemoveIcon />
      </Button>
      <Button variant={value === "dashed" ? "contained" : "outlined"} onClick={() => onValueChange("dashed")}>
        <b>---</b>
      </Button>
      <Button variant={value === "dotted" ? "contained" : "outlined"} onClick={() => onValueChange("dotted")}>
        <MoreHorizIcon />
      </Button>
    </ButtonGroup>
  );
}

export default SolidDashedDottedTool;
