import { Box, Slider, Tooltip } from "@mui/material";

interface SliderToolProps {
  value: number | undefined;
  onValueChange: (value: number) => void;
}

export function SliderTool({ value, onValueChange }: SliderToolProps) {
  const handleChange = (_event: React.SyntheticEvent | Event, value: number | number[]) => {
    onValueChange(value as number);
  };

  return (
    <Tooltip title="Opacity" arrow>
      <Box sx={{ width: 40, display: "flex", alignItems: "center", mr: 1 }}>
        <Slider size="small" defaultValue={value} step={1} min={0} max={255} onChangeCommitted={handleChange} />
      </Box>
    </Tooltip>
  );
}
