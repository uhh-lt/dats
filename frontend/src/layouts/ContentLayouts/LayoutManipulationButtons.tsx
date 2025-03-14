import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { Box, Button, Stack } from "@mui/material";
interface LayoutManipulationButtonsProps {
  onIncreaseClick: () => void;
  onDecreaseClick: () => void;
  isLeft: boolean;
}

function LayoutManipulationButtons({ onIncreaseClick, onDecreaseClick, isLeft }: LayoutManipulationButtonsProps) {
  return (
    <Box
      className={"toggle-on-hover " + (isLeft ? "toggle-on-hover-left" : "toggle-on-hover-right")}
      sx={{
        display: "flex",
        alignItems: "center",
        position: "absolute",
        left: isLeft ? "-8px" : null,
        right: !isLeft ? "-8px" : null,
        bottom: 0,
        top: 0,
        width: "20px",
      }}
    >
      <Stack className="toggle-content" gap={1} direction={"column"}>
        <Button
          style={{ minWidth: "20px", borderRadius: "100%", padding: 0, margin: 0, zIndex: 1 }}
          variant="contained"
          onClick={onIncreaseClick}
        >
          <AddIcon fontSize="small" />
        </Button>
        <Button
          style={{ minWidth: "20px", borderRadius: "100%", padding: 0, margin: 0, zIndex: 1 }}
          variant="contained"
          onClick={onDecreaseClick}
        >
          <RemoveIcon fontSize="small" />
        </Button>
      </Stack>
    </Box>
  );
}

export default LayoutManipulationButtons;
