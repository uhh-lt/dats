import { OutlinedInput } from "@mui/material";

interface NumberToolProps {
  value: number | undefined;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
}

function NumberTool({ value, onValueChange, min, max }: NumberToolProps) {
  let timeout: NodeJS.Timeout | undefined;
  const handleStrokeWidthChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      onValueChange(parseInt(event.target.value));
    }, 333);
  };

  return (
    <OutlinedInput
      sx={{ bgcolor: "background.paper", p: 0, mr: 1 }}
      type="number"
      onChange={handleStrokeWidthChange}
      defaultValue={value}
      inputProps={{
        style: {
          padding: "1.5px 3px",
          height: "28px",
          width: "34px",
        },
        min: min,
        max: max,
      }}
    />
  );
}

export default NumberTool;
